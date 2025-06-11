import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import { Parser } from "./parse";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from "vscode-languageclient/node";

// Create a global parser instance
const parser = new Parser();

const decorationType = vscode.window.createTextEditorDecorationType({
  backgroundColor: "rgba(255, 255, 0, 0.3)", // Light yellow background
  border: "1px solid yellow", // Optional border
});

function bringDocumentToFront(
  documentUri: vscode.Uri,
  rangeInfo: {
    start: vscode.Position;
    end: vscode.Position;
  }
) {
  const openEditors = vscode.window.visibleTextEditors;
  // Find the editor with the document you want
  const targetEditor = openEditors.find(
    (editor) => editor.document.uri.toString() === documentUri.toString()
  );
  if (targetEditor) {
    // If the document is already open, reveal the range and focus on it
    const range = new vscode.Range(
      rangeInfo.start,
      rangeInfo.end ?? rangeInfo.start
    );
    targetEditor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    targetEditor.setDecorations(decorationType, [range]);
    activeEditor = targetEditor;
    vscode.window.showTextDocument(
      targetEditor.document,
      targetEditor.viewColumn
    );
  }
}


let currentPanel: vscode.WebviewPanel | undefined;
let currentDocument: vscode.TextDocument | undefined;
let activeEditor: vscode.TextEditor | undefined;
let client: LanguageClient;

// Function to clear decorations
function clearDecorations() {
  if (activeEditor) {
    activeEditor.setDecorations(decorationType, []);
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Start the Language Server
  startLanguageServer(context);
  
  vscode.window.onDidChangeActiveTextEditor((editor) => {
    activeEditor = editor;
    if (editor) {
      const document = editor.document;
      const fileName = document.fileName;
      const fileTypeMatch = path.extname(fileName).toLowerCase() === ".uikitml";
      // Check if the document is a .uikitml file
      if (fileTypeMatch && document !== currentDocument) {
        currentDocument = document;
        vscode.window.showInformationMessage(
          `Active document changed to: ${fileName}`
        );
        if (currentPanel) {
          updateWebviewContent(currentPanel, document);
        }
      }
    }
  });

  // Clear decorations when user starts typing
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (activeEditor && event.document === activeEditor.document) {
      clearDecorations();
    }
  });

  context.subscriptions.push(
    vscode.commands.registerCommand("uikit-preview.showPreview", () => {
      const document = vscode.window.activeTextEditor?.document;

      if (
        !document ||
        path.extname(document.fileName).toLowerCase() !== ".uikitml"
      ) {
        return;
      }
      if (currentPanel) {
        // If a panel already exists, just update the document mapping
        if (currentDocument !== document) {
          currentDocument = document;
          updateWebviewContent(currentPanel, document);
        }
        // Move the panel to the right column if needed
        if (
          currentPanel.viewColumn === vscode.window.activeTextEditor?.viewColumn
        ) {
          currentPanel.reveal(vscode.ViewColumn.Two);
        } else {
          currentPanel.reveal();
        }
      } else {
        // Create a new panel
        currentDocument = document;
        currentPanel = createWebviewPanel(context, document);
      }
    })
  );
  vscode.workspace.onDidChangeTextDocument((event) => {
    if (event.document === currentDocument && currentPanel) {
      updateWebviewContent(currentPanel, event.document);
    }
  });
}
function createWebviewPanel(
  context: vscode.ExtensionContext,
  document: vscode.TextDocument
): vscode.WebviewPanel {
  const basename = path.basename(document.fileName);
  const panel = vscode.window.createWebviewPanel(
    "uikitPreview",
    `${basename} (UIKit)`,
    vscode.ViewColumn.Two,
    {
      enableScripts: true,
      retainContextWhenHidden: true,
    }
  );
  const htmlPath = path.join(
    context.extensionPath,
    "dist",
    "webview",
    "index.html"
  );
  const html = fs.readFileSync(htmlPath, "utf8");
  panel.webview.html = html;
  panel.onDidDispose(() => {
    currentPanel = undefined;
  });

  panel.webview.onDidReceiveMessage(
    (message) => {
      const { json, command } = message;
      if (command === "request-content") {
        updateWebviewContent(panel, document);
      } else if (command === "jump-to") {
        const uid = message.uid;
        const info = parser.getRangeInfo(uid);
        if (info) {
          if (currentDocument) {
            bringDocumentToFront(currentDocument.uri, info);
          }
        }
      } else if (command === "apply-changes") {
        const { uid, elementId, changes } = message;
        if (currentDocument) {
          applyMultiplePropertyChanges(currentDocument, uid, elementId, changes);
        }
      } else if (command === "gen-config") {
        vscode.window
          .showSaveDialog({
            defaultUri: vscode.Uri.file(document.fileName),
            filters: { JavaScript: ["js", "jsx"], TypeScript: ["ts", "tsx"] },
          })
          .then((uri) => {
            if (uri) {
              // Get the file extension
              const extension = path.extname(uri.fsPath).toLowerCase();
              if (extension === ".js" || extension === ".jsx") {
                const fileString = `export const uiConfig = /** @type {const} */ (${JSON.stringify(
                  json,
                  null,
                  2
                )});`;
                fs.writeFileSync(uri.fsPath, fileString);
                vscode.window.showInformationMessage(
                  "UIKit config (JS) generated successfully!"
                );
              } else if (extension === ".ts" || extension === ".tsx") {
                const fileString = `export const uiConfig = ${JSON.stringify(
                  json,
                  null,
                  2
                )} as const;`;

                fs.writeFileSync(uri.fsPath, fileString);
                vscode.window.showInformationMessage(
                  "UIKit config (TS) generated successfully!"
                );
              }
            }
          });
      }
    },
    undefined,
    context.subscriptions
  );

  return panel;
}
async function updateWebviewContent(
  panel: vscode.WebviewPanel,
  document: vscode.TextDocument
) {
  const basename = path.basename(document.fileName);
  panel.title = `${basename} (UIKit)`;
  
  // Parse the document and get the JSON
  const json = await parser.parse(document.getText(), document.uri);
  
  panel.webview.postMessage({
    command: "update",
    json: json,
    text: document.getText()
  });
}

export function modifyElementProperty(elementText: string, property: string, value: any): string | null {
  // Parse the element tag to extract attributes (handle self-closing elements)
  const tagMatch = elementText.match(/^<([^>\s]+)([^>]*?)(\/?)>/);
  if (!tagMatch) {
    return null;
  }
  
  const tagName = tagMatch[1];
  const attributesText = tagMatch[2];
  const isSelfClosing = tagMatch[3] === '/';
  const restOfElement = elementText.substring(tagMatch[0].length);
  
  // Parse existing attributes
  const attributes = parseAttributes(attributesText);
  
  // Apply the property change
  if (property === 'width' || property === 'height' || 
      property === 'padding' || property === 'paddingTop' || property === 'marginTop' ||
      property === 'borderTopLeftRadius' || property === 'borderTopRightRadius' || 
      property === 'borderBottomLeftRadius' || property === 'borderBottomRightRadius' ||
      property === 'borderWidth' || property === 'borderTopWidth' ||
      property === 'opacity' || property === 'gapRow' || property === 'gapColumn' ||
      property === 'positionTop' || property === 'positionLeft' || property === 'positionRight') {
    // Numeric properties - add to style attribute
    updateStyleAttribute(attributes, property, value);
  } else if (property === 'backgroundColor' || property === 'color' || property === 'borderColor') {
    // Color properties - add to style attribute
    updateStyleAttribute(attributes, property, value);
  } else if (property === 'display' || property === 'flexDirection' || 
             property === 'justifyContent' || property === 'alignItems' ||
             property === 'positionType') {
    // Enum properties - add to style attribute
    updateStyleAttribute(attributes, property, value);
  }
  
  // Rebuild the element
  const newAttributesText = serializeAttributes(attributes);
  if (isSelfClosing) {
    return `<${tagName}${newAttributesText} />`;
  } else {
    return `<${tagName}${newAttributesText}>${restOfElement}`;
  }
}

export function parseAttributes(attributesText: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const regex = /\s+([a-zA-Z-]+)(?:\s*=\s*["']([^"']*)["'])?/g;
  let match;
  
  while ((match = regex.exec(attributesText)) !== null) {
    const attrName = match[1];
    const attrValue = match[2] || '';
    attributes[attrName] = attrValue;
  }
  
  return attributes;
}

export function updateStyleAttribute(attributes: Record<string, string>, property: string, value: any) {
  const currentStyle = attributes.style || '';
  const styleProps = parseStyleString(currentStyle);
  
  // Convert camelCase to kebab-case for CSS
  const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
  
  // Set the new value
  if (value !== undefined && value !== null && value !== '') {
    styleProps[cssProperty] = String(value);
  } else {
    delete styleProps[cssProperty];
  }
  
  // Serialize back to style string
  attributes.style = serializeStyleProps(styleProps);
}

export function parseStyleString(styleStr: string): Record<string, string> {
  const props: Record<string, string> = {};
  if (!styleStr) {
    return props;
  }
  
  const declarations = styleStr.split(';').filter(d => d.trim());
  for (const decl of declarations) {
    const colonIndex = decl.indexOf(':');
    if (colonIndex > 0) {
      const prop = decl.substring(0, colonIndex).trim();
      const value = decl.substring(colonIndex + 1).trim();
      props[prop] = value;
    }
  }
  
  return props;
}

export function serializeStyleProps(props: Record<string, string>): string {
  return Object.entries(props)
    .filter(([_, value]) => value.trim())
    .map(([prop, value]) => `${prop}: ${value}`)
    .join('; ');
}

export function serializeAttributes(attributes: Record<string, string>): string {
  return Object.entries(attributes)
    .filter(([_, value]) => value !== undefined)
    .map(([name, value]) => {
      if (value === '') {
        return ` ${name}`;
      }
      return ` ${name}="${value}"`;
    })
    .join('');
}

async function applyMultiplePropertyChanges(
  document: vscode.TextDocument,
  uid: string,
  _elementId: string,
  changes: Record<string, any>
) {
  // Get the range info for the element
  const rangeInfo = parser.getRangeInfo(uid);
  if (!rangeInfo) {
    vscode.window.showErrorMessage(`Could not find element with UID: ${uid}`);
    return;
  }

  const edit = new vscode.WorkspaceEdit();
  
  // Get the element text
  const elementRange = new vscode.Range(rangeInfo.start, rangeInfo.end);
  let elementText = document.getText(elementRange);
  
  // Apply all property changes to the element
  for (const [property, value] of Object.entries(changes)) {
    const modifiedElement = modifyElementProperty(elementText, property, value);
    if (modifiedElement && modifiedElement !== elementText) {
      elementText = modifiedElement;
    }
  }
  
  // Apply the final result
  if (elementText !== document.getText(elementRange)) {
    edit.replace(document.uri, elementRange, elementText);
    await vscode.workspace.applyEdit(edit);
  }
}


function startLanguageServer(context: vscode.ExtensionContext) {
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(path.join('dist', 'server.js'));
  
  // The debug options for the server
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
  
  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };
  
  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for uikitml documents (now treated as HTML)
    documentSelector: [{ scheme: 'file', pattern: '**/*.uikitml' }],
    synchronize: {
      // Notify the server about file changes to '.uikitml' files contained in the workspace
      fileEvents: vscode.workspace.createFileSystemWatcher('**/*.uikitml')
    }
  };
  
  // Create the language client and start the client.
  client = new LanguageClient(
    'uikitMLLanguageServer',
    'UIKitML Language Server',
    serverOptions,
    clientOptions
  );
  
  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
