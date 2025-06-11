import * as vscode from "vscode";
import { parse as parse5Parse, serializeOuter } from "parse5";

// Dynamic import for ESM module
let uikitmlParse: any;

// Load the ESM module dynamically
async function loadUikitml() {
  if (!uikitmlParse) {
    const module = await import("@pmndrs/uikitml");
    uikitmlParse = module.parse;
  }
}

interface RangeInfo {
  start: vscode.Position;
  end: vscode.Position;
  uri?: vscode.Uri;
}

interface SourceMapEntry {
  start: vscode.Position;
  end: vscode.Position;
}

export class Parser {
  private elementMap: Map<string, SourceMapEntry> = new Map();
  private classMap: Map<string, SourceMapEntry> = new Map();
  private idStyleMap: Map<string, { styles: string; range: SourceMapEntry }> = new Map();
  private nextId: number = 1;
  private currentUri?: vscode.Uri;

  /**
   * Parse HTML text and return UIKit JSON with source mapping
   */
  async parse(htmlText: string, uri?: vscode.Uri): Promise<any> {
    // Clear previous mappings
    this.elementMap.clear();
    this.classMap.clear();
    this.idStyleMap.clear();
    this.nextId = 1;
    this.currentUri = uri;

    try {
      // Parse HTML with source code location info
      const document = parse5Parse(htmlText, { sourceCodeLocationInfo: true });
      

      // Extract style and body content
      let styleContent = "";
      let bodyContent = "";

      // First pass: Walk the document tree to annotate elements with data-uid
      this.walkDocument(document, () => {}, true);

      // Second pass: Extract style and body content after all elements are annotated
      let hasExplicitBody = false;
      this.walkDocument(document, (node: any) => {
        if (
          node.nodeName === "style" &&
          node.childNodes &&
          node.childNodes.length > 0
        ) {
          // Extract style content
          const textNode = node.childNodes[0];
          if (textNode && textNode.nodeName === "#text") {
            styleContent += textNode.value;

            // Parse CSS to extract class and ID locations
            if (node.sourceCodeLocation) {
              this.extractClassLocations(
                textNode.value,
                node.sourceCodeLocation
              );
              this.extractIdStyles(
                textNode.value,
                node.sourceCodeLocation
              );
            }
          }
        } else if (node.nodeName === "body" && node.childNodes) {
          // Serialize body content (excluding the body tag itself)
          hasExplicitBody = true;
          bodyContent = node.childNodes.map((child: any) => serializeOuter(child)).join("");
        }
      }, false);

      // If no explicit body tag was found, serialize all non-style elements
      if (!hasExplicitBody) {
        const bodyElements: any[] = [];
        
        // Walk the entire document to find body content
        // This should never happen with parse5 as it always creates html/body structure
        // But keeping for safety
        const findBodyContent = (node: any) => {
          if (!node || !node.childNodes) {
            return;
          }
          
          for (const child of node.childNodes) {
            if (child.nodeName === 'html' || child.nodeName === 'body') {
              findBodyContent(child);
            } else if (child.nodeName !== 'style' && 
                       child.nodeName !== 'script' && 
                       child.nodeName !== '#comment' &&
                       child.nodeName !== 'head' &&
                       child.nodeName !== '#document') {
              bodyElements.push(child);
            }
          }
        };
        
        findBodyContent(document);
        bodyContent = bodyElements.map((el) => serializeOuter(el)).join('');
      }

      // Apply ID-based styles inline before stitching
      const processedBodyContent = this.applyIdStylesToElements(bodyContent);

      // Stitch together style and body content
      const stitchedContent = styleContent
        ? `<style>${styleContent}</style>${processedBodyContent}`
        : processedBodyContent;
        


      // Load uikitml if not already loaded
      await loadUikitml();

      // Parse with uikitml
      const result = uikitmlParse(stitchedContent, {
        onError: (error: any) => {
          console.error("UIKit parse error:", error);
        },
        availableKits: [],
      });

      return result;
    } catch (error) {
      console.error("Parse error:", error);
      return undefined;
    }
  }

  /**
   * Get range info for an element ID or class name
   */
  getRangeInfo(idOrClassName: string): RangeInfo | undefined {
    // Check element map first
    const elementRange = this.elementMap.get(idOrClassName);
    if (elementRange) {
      return { ...elementRange, uri: this.currentUri };
    }

    // Check class map
    const classRange = this.classMap.get(idOrClassName);
    if (classRange) {
      return { ...classRange, uri: this.currentUri };
    }

    // Check ID style map for eid-{elementId} lookups
    if (idOrClassName.startsWith('eid-')) {
      const elementId = idOrClassName.substring(4);
      const idStyleEntry = this.idStyleMap.get(elementId);
      if (idStyleEntry) {
        return { ...idStyleEntry.range, uri: this.currentUri };
      }
    }

    return undefined;
  }

  /**
   * Walk the document tree and optionally annotate elements with IDs
   */
  private walkDocument(node: any, callback: (node: any) => void, annotateOnly: boolean = true): void {
    // In the first pass, just annotate elements
    if (annotateOnly) {
      // Annotate element with ID if it has source location
      if (
        node.nodeName !== "#text" &&
        node.nodeName !== "#comment" &&
        node.sourceCodeLocation &&
        node.nodeName !== "html" &&
        node.nodeName !== "head" &&
        node.nodeName !== "body" &&
        node.nodeName !== "style" &&
        node.nodeName !== "#document" &&
        node.nodeName !== "script"
      ) {
        const uid = `eid-${this.nextId++}`;
        const loc = node.sourceCodeLocation;
        

        // Store element location
        this.elementMap.set(uid, {
          start: new vscode.Position(loc.startLine - 1, loc.startCol - 1),
          end: new vscode.Position(loc.endLine - 1, loc.endCol - 1),
        });

        // Add data-uid attribute
        node.attrs = node.attrs || [];
        node.attrs.push({ name: "data-uid", value: uid });
      }
    } else {
      // In the second pass, call the callback for processing
      callback(node);
    }

    // Recursively walk children
    if (node.childNodes) {
      node.childNodes.forEach((child: any) =>
        this.walkDocument(child, callback, annotateOnly)
      );
    }
  }


  /**
   * Extract class locations from CSS text
   */
  private extractClassLocations(cssText: string, styleLocation: any): void {
    // Regular expression to match CSS class selectors
    const classRegex = /\.([a-zA-Z_][\w-]*)\s*{/g;
    let match;

    const styleStartLine = styleLocation.startLine - 1;
    const styleStartCol = styleLocation.startCol - 1;

    // Split CSS into lines for accurate position calculation
    const lines = cssText.split("\n");
    let currentLine = 0;
    let currentCol = 0;

    while ((match = classRegex.exec(cssText)) !== null) {
      const className = match[1];
      const matchIndex = match.index;

      // Calculate line and column of the match
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= matchIndex) {
          currentLine = i;
          currentCol = matchIndex - charCount;
          break;
        }
        charCount += lines[i].length + 1; // +1 for newline
      }

      // Calculate absolute position
      const startLine = styleStartLine + currentLine;
      const startCol =
        currentLine === 0 ? styleStartCol + currentCol : currentCol;

      // Store class location (including the dot)
      this.classMap.set(className, {
        start: new vscode.Position(startLine, startCol),
        end: new vscode.Position(startLine, startCol + className.length + 1), // +1 for the dot
      });
    }
  }

  /**
   * Extract ID-based styles from CSS text
   */
  private extractIdStyles(cssText: string, styleLocation: any): void {
    // Regular expression to match CSS ID selectors and their rules
    const idRuleRegex = /#([a-zA-Z_][\w-]*)\s*{([^}]*)}/g;
    let match;

    const styleStartLine = styleLocation.startLine - 1;
    const styleStartCol = styleLocation.startCol - 1;

    // Split CSS into lines for accurate position calculation
    const lines = cssText.split("\n");

    while ((match = idRuleRegex.exec(cssText)) !== null) {
      const idName = match[1];
      const styleContent = match[2].trim();
      const matchIndex = match.index;

      // Calculate line and column of the match
      let charCount = 0;
      let currentLine = 0;
      let currentCol = 0;
      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length >= matchIndex) {
          currentLine = i;
          currentCol = matchIndex - charCount;
          break;
        }
        charCount += lines[i].length + 1; // +1 for newline
      }

      // Calculate absolute position
      const startLine = styleStartLine + currentLine;
      const startCol =
        currentLine === 0 ? styleStartCol + currentCol : currentCol;

      // Store ID style with location (including the hash)
      this.idStyleMap.set(idName, {
        styles: styleContent,
        range: {
          start: new vscode.Position(startLine, startCol),
          end: new vscode.Position(startLine, startCol + match[0].length),
        },
      });
    }
  }

  /**
   * Apply ID-based styles to elements with matching IDs
   */
  private applyIdStylesToElements(htmlContent: string): string {
    // For each ID style we found, look for elements with that ID and inline the styles
    let processedContent = htmlContent;
    
    this.idStyleMap.forEach((styleInfo, idName) => {
      // Match elements with this ID (use word boundary to avoid matching inside other attributes)
      const elementRegex = new RegExp(
        `(<[^>]+\\bid\\s*=\\s*["']${idName}["'][^>]*)(>)`,
        'g'
      );
      
      processedContent = processedContent.replace(elementRegex, (_match, beforeClosing, closing) => {
        // Check if element already has a style attribute
        const styleAttrMatch = beforeClosing.match(/\bstyle\s*=\s*["']([^"']*)["']/);
        
        if (styleAttrMatch) {
          // Merge with existing styles
          const existingStyles = styleAttrMatch[1];
          const mergedStyles = `${existingStyles}; ${styleInfo.styles}`;
          const updatedElement = beforeClosing.replace(
            styleAttrMatch[0],
            ` style="${mergedStyles}"`
          );
          return updatedElement + closing;
        } else {
          // Add new style attribute
          return `${beforeClosing} style="${styleInfo.styles}"${closing}`;
        }
      });
    });
    
    return processedContent;
  }
}
