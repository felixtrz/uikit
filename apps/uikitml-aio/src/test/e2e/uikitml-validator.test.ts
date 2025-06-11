import * as assert from "assert";
import { TextDocument } from "vscode-languageserver-textdocument";
import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node";
import { UIKitMLValidator } from "../../server/uikitml-validator";

suite("UIKitML Validator Test Suite", () => {
  let validator: UIKitMLValidator;

  setup(() => {
    validator = new UIKitMLValidator();
  });

  function createDocument(content: string): TextDocument {
    return TextDocument.create("test://test.uikitml", "uikitml", 1, content);
  }

  function getDiagnostics(content: string): Diagnostic[] {
    const document = createDocument(content);
    return validator.validateDocument(document);
  }

  function assertHasError(
    diagnostics: Diagnostic[],
    expectedMessage: string,
    expectedLine?: number
  ) {
    const error = diagnostics.find(
      (d) =>
        d.severity === DiagnosticSeverity.Error &&
        d.message.includes(expectedMessage)
    );
    assert.ok(
      error,
      `Expected error containing "${expectedMessage}" but found none`
    );
    if (expectedLine !== undefined) {
      assert.strictEqual(
        error.range.start.line,
        expectedLine,
        `Expected error on line ${expectedLine}`
      );
    }
  }

  function assertHasWarning(
    diagnostics: Diagnostic[],
    expectedMessage: string
  ) {
    const warning = diagnostics.find(
      (d) =>
        d.severity === DiagnosticSeverity.Warning &&
        d.message.includes(expectedMessage)
    );
    assert.ok(
      warning,
      `Expected warning containing "${expectedMessage}" but found none`
    );
  }

  function assertNoErrors(diagnostics: Diagnostic[]) {
    const errors = diagnostics.filter(
      (d) => d.severity === DiagnosticSeverity.Error
    );
    assert.strictEqual(
      errors.length,
      0,
      `Expected no errors but found: ${errors.map((e) => e.message).join(", ")}`
    );
  }

  suite("HTML Tag Validation", () => {
    test("Valid HTML tags should not produce errors", () => {
      const content = `
        <div>Content</div>
        <span>Text</span>
        <p>Paragraph</p>
        <h1>Heading</h1>
        <button>Click me</button>
        <img src="test.jpg" />
        <ul><li>Item</li></ul>
        <a href="#">Link</a>
        <textarea>Text</textarea>
        <video src="video.mp4"></video>
        <svg><path /></svg>
      `;
      const diagnostics = getDiagnostics(content);
      assertNoErrors(diagnostics);
    });

    test("Invalid HTML tags should produce errors", () => {
      const content = `
        <table>Not supported</table>
        <form>Not supported</form>
        <select>Not supported</select>
        <iframe>Not supported</iframe>
        <script>Not supported</script>
        <canvas>Not supported</canvas>
      `;
      const diagnostics = getDiagnostics(content);

      assertHasError(diagnostics, "Element 'table' is not supported", 1);
      assertHasError(diagnostics, "Element 'form' is not supported", 2);
      assertHasError(diagnostics, "Element 'select' is not supported", 3);
      assertHasError(diagnostics, "Element 'iframe' is not supported", 4);
      assertHasError(diagnostics, "Element 'script' is not supported", 5);
      assertHasError(diagnostics, "Element 'canvas' is not supported", 6);
    });

    test("Valid custom elements should not produce errors", () => {
      const content = `
        <ui-button>Custom Button</ui-button>
        <layout-grid>Grid</layout-grid>
        <my-custom-component>Content</my-custom-component>
        <app-header-nav>Navigation</app-header-nav>
      `;
      const diagnostics = getDiagnostics(content);
      assertNoErrors(diagnostics);
    });

    test("Invalid custom elements should produce errors", () => {
      const content = `
        <CustomElement>Invalid - capital letters</CustomElement>
        <custom_element>Invalid - underscore</custom_element>
        <customElement>Invalid - no hyphen</customElement>
        <123-element>Invalid - starts with number</123-element>
        <-element>Invalid - starts with hyphen</-element>
      `;
      const diagnostics = getDiagnostics(content);

      assertHasError(
        diagnostics,
        "Element 'CustomElement' is not supported",
        1
      );
      assertHasError(
        diagnostics,
        "Element 'custom_element' is not supported",
        2
      );
      assertHasError(
        diagnostics,
        "Element 'customElement' is not supported",
        3
      );
      assert.ok(diagnostics.length >= 3, "Should have at least 3 errors");
    });

    test("Void elements should warn if not self-closing", () => {
      const content = `
        <img src="test.jpg">
        <input type="text">
      `;
      const diagnostics = getDiagnostics(content);

      assertHasWarning(diagnostics, "Element 'img' is a void element");
      assertHasWarning(diagnostics, "Element 'input' is a void element");
    });

    test("Self-closing void elements should not produce warnings", () => {
      const content = `
        <img src="test.jpg" />
        <input type="text" />
      `;
      const diagnostics = getDiagnostics(content);
      assert.strictEqual(diagnostics.length, 0, "Should have no warnings");
    });
  });

  suite("Attribute Validation", () => {
    test("Valid attributes should not produce warnings", () => {
      const content = `
        <div id="main" class="container" style="padding: 2;">Content</div>
        <img src="image.jpg" alt="Description" width="100" height="100" />
        <a href="#" target="_blank" rel="noopener">Link</a>
        <button type="button" disabled name="submit">Submit</button>
        <div data-value="123" aria-label="Test">Content</div>
      `;
      const diagnostics = getDiagnostics(content);
      const warnings = diagnostics.filter(
        (d) => d.severity === DiagnosticSeverity.Warning
      );
      assert.strictEqual(warnings.length, 0, "Should have no warnings");
    });

    test("Unknown attributes should produce warnings", () => {
      const content = `
        <div unknown-attr="value">Content</div>
        <button weird-prop="test">Click</button>
      `;
      const diagnostics = getDiagnostics(content);

      assertHasWarning(
        diagnostics,
        "Attribute 'unknown-attr' may not be supported"
      );
      assertHasWarning(
        diagnostics,
        "Attribute 'weird-prop' may not be supported"
      );
    });

    test("Empty src attribute on img should produce error", () => {
      const content = `
        <img src="" alt="Empty source" />
        <img src="  " alt="Whitespace source" />
      `;
      const diagnostics = getDiagnostics(content);

      assert.ok(
        diagnostics.some(
          (d) =>
            d.severity === DiagnosticSeverity.Error &&
            d.message.includes("Image element requires a valid 'src' attribute")
        ),
        "Should have error for empty src"
      );
    });

    test("Style attribute CSS validation", () => {
      const content = `
        <div style="display: flex; unknown-property: value; position: invalid;">Content</div>
      `;
      const diagnostics = getDiagnostics(content);

      assertHasWarning(
        diagnostics,
        "CSS property 'unknown-property' may not be supported"
      );
      assertHasWarning(
        diagnostics,
        "Position value 'invalid' may not be supported"
      );
    });
  });

  suite("CSS Validation", () => {
    test("Valid CSS properties in style tag should not produce warnings", () => {
      const content = `
        <style>
          .container {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100px;
            height: 100px;
            background-color: #333;
            padding: 10px;
            margin: 20px;
            border: 1px solid black;
            border-radius: 5px;
          }
        </style>
      `;
      const diagnostics = getDiagnostics(content);
      const warnings = diagnostics.filter(
        (d) => d.severity === DiagnosticSeverity.Warning
      );
      assert.strictEqual(
        warnings.length,
        0,
        "Should have no warnings for valid CSS"
      );
    });

    test("Unknown CSS properties should produce warnings", () => {
      const content = `
        <style>
          .test {
            unknown-property: value;
            webkit-fake-prop: test;
            invalid-css: 123;
          }
        </style>
      `;
      const diagnostics = getDiagnostics(content);

      assertHasWarning(
        diagnostics,
        "CSS property 'unknown-property' may not be supported"
      );
      assertHasWarning(
        diagnostics,
        "CSS property 'webkit-fake-prop' may not be supported"
      );
      assertHasWarning(
        diagnostics,
        "CSS property 'invalid-css' may not be supported"
      );
    });

    test("Invalid CSS values for known properties should produce warnings", () => {
      const content = `
        <style>
          .test {
            display: invalid-display;
            flex-direction: diagonal;
            position: floating;
            justify-content: middle;
          }
        </style>
      `;
      const diagnostics = getDiagnostics(content);

      assertHasWarning(
        diagnostics,
        "Display value 'invalid-display' may not be supported"
      );
      assertHasWarning(
        diagnostics,
        "Flex-direction value 'diagonal' may not be supported"
      );
      assertHasWarning(
        diagnostics,
        "Position value 'floating' may not be supported"
      );
    });

    test("Valid CSS values should not produce warnings", () => {
      const content = `
        <style>
          .test {
            display: flex;
            flex-direction: row;
            position: relative;
            justify-content: center;
          }
        </style>
      `;
      const diagnostics = getDiagnostics(content);
      const warnings = diagnostics.filter(
        (d) => d.severity === DiagnosticSeverity.Warning
      );
      assert.strictEqual(
        warnings.length,
        0,
        "Should have no warnings for valid CSS values"
      );
    });
  });

  suite("Complex Document Validation", () => {
    test("Complete valid UIKitML document should have no errors", () => {
      const content = `
        <style>
          .container {
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            background-color: #f0f0f0;
          }
          
          #main-button {
            background-color: blue;
            color: white;
            border-radius: 5px;
            cursor: pointer;
          }
          
          .text {
            font-size: 16px;
            font-weight: bold;
            text-align: center;
          }
        </style>
        
        <div class="container" id="app">
          <h1 class="text">Welcome to UIKitML</h1>
          <p>This is a valid UIKitML document</p>
          
          <button id="main-button" type="button">
            Click Me
          </button>
          
          <img src="logo.png" alt="Logo" width="100" height="100" />
          
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
          
          <ui-custom-component data-value="test">
            Custom content
          </ui-custom-component>
        </div>
      `;
      const diagnostics = getDiagnostics(content);
      assertNoErrors(diagnostics);

      // Should have no warnings either
      const warnings = diagnostics.filter(
        (d) => d.severity === DiagnosticSeverity.Warning
      );
      assert.strictEqual(warnings.length, 0, "Should have no warnings");
    });

    test("Mixed valid and invalid elements should report only invalid ones", () => {
      const content = `
        <div>Valid</div>
        <table>Invalid</table>
        <span>Valid</span>
        <form>Invalid</form>
        <button>Valid</button>
      `;
      const diagnostics = getDiagnostics(content);

      // Should have exactly 2 errors (table and form)
      const errors = diagnostics.filter(
        (d) => d.severity === DiagnosticSeverity.Error
      );
      assert.strictEqual(errors.length, 2, "Should have exactly 2 errors");

      assertHasError(diagnostics, "Element 'table' is not supported");
      assertHasError(diagnostics, "Element 'form' is not supported");
    });
  });

  suite("Edge Cases", () => {
    test("Empty document should produce no diagnostics", () => {
      const diagnostics = getDiagnostics("");
      assert.strictEqual(
        diagnostics.length,
        0,
        "Empty document should have no diagnostics"
      );
    });

    test("Document with only text should produce no diagnostics", () => {
      const diagnostics = getDiagnostics("Just some plain text");
      assert.strictEqual(
        diagnostics.length,
        0,
        "Plain text should have no diagnostics"
      );
    });

    test("Malformed tags should still be validated", () => {
      const content = "<div <span>Malformed</span>";
      const diagnostics = getDiagnostics(content);
      // The regex should still match the span tag
      assert.ok(
        diagnostics.length === 0 ||
          diagnostics.every((d) => !d.message.includes("span")),
        "Valid span tag should not produce error even in malformed context"
      );
    });

    test("Nested style attributes should be validated", () => {
      const content = `
        <div style="display: flex;">
          <span style="unknown-prop: value;">Text</span>
        </div>
      `;
      const diagnostics = getDiagnostics(content);
      assertHasWarning(
        diagnostics,
        "CSS property 'unknown-prop' may not be supported"
      );
    });

    test("Case sensitivity in tag names", () => {
      const content = `
        <DIV>Content</DIV>
        <Div>Content</Div>
        <div>Content</div>
      `;
      const diagnostics = getDiagnostics(content);
      // HTML is case-insensitive, so these should all be valid
      assertNoErrors(diagnostics);
    });
  });
});
