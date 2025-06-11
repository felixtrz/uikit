import * as assert from "assert";
import * as vscode from "vscode";

// Import the internal functions for testing (we'll need to export them)
import {
  modifyElementProperty,
  parseAttributes,
  updateStyleAttribute,
  parseStyleString,
  serializeStyleProps,
  serializeAttributes,
} from "../../extension/extension";

suite("Extension Property Editing Test Suite", () => {
  test("parseAttributes extracts HTML attributes correctly", () => {
    const attributesText =
      ' class="test-class" id="test-id" style="color: red;" data-uid="eid-1"';
    const result = parseAttributes(attributesText);

    assert.strictEqual(result.class, "test-class");
    assert.strictEqual(result.id, "test-id");
    assert.strictEqual(result.style, "color: red;");
    assert.strictEqual(result["data-uid"], "eid-1");
  });

  test("parseAttributes handles empty and boolean attributes", () => {
    const attributesText = ' disabled hidden="hidden" class=""';
    const result = parseAttributes(attributesText);

    assert.strictEqual(result.disabled, "");
    assert.strictEqual(result.hidden, "hidden");
    assert.strictEqual(result.class, "");
  });

  test("parseStyleString parses CSS declarations correctly", () => {
    const styleStr = "color: red; font-size: 14px; margin-top: 10px";
    const result = parseStyleString(styleStr);

    assert.strictEqual(result.color, "red");
    assert.strictEqual(result["font-size"], "14px");
    assert.strictEqual(result["margin-top"], "10px");
  });

  test("parseStyleString handles empty and malformed styles", () => {
    assert.deepStrictEqual(parseStyleString(""), {});
    assert.deepStrictEqual(parseStyleString("invalid-style"), {});

    const result = parseStyleString("color: red; invalid; font-size: 14px;");
    assert.strictEqual(result.color, "red");
    assert.strictEqual(result["font-size"], "14px");
    assert.strictEqual(result.invalid, undefined);
  });

  test("serializeStyleProps creates valid CSS string", () => {
    const props = {
      color: "red",
      "font-size": "14px",
      "margin-top": "10px",
    };
    const result = serializeStyleProps(props);

    assert.strictEqual(result, "color: red; font-size: 14px; margin-top: 10px");
  });

  test("serializeStyleProps filters empty values", () => {
    const props = {
      color: "red",
      "font-size": "",
      "margin-top": "  ",
      padding: "5px",
    };
    const result = serializeStyleProps(props);

    assert.strictEqual(result, "color: red; padding: 5px");
  });

  test("serializeAttributes creates valid HTML attributes", () => {
    const attributes = {
      class: "test-class",
      id: "test-id",
      style: "color: red;",
      disabled: "",
      "data-uid": "eid-1",
    };
    const result = serializeAttributes(attributes);

    assert.ok(result.includes(' class="test-class"'));
    assert.ok(result.includes(' id="test-id"'));
    assert.ok(result.includes(' style="color: red;"'));
    assert.ok(result.includes(" disabled"));
    assert.ok(result.includes(' data-uid="eid-1"'));
  });

  test("updateStyleAttribute adds new CSS property", () => {
    const attributes: Record<string, string> = { class: "test" };
    updateStyleAttribute(attributes, "backgroundColor", "blue");

    assert.strictEqual(attributes.style, "background-color: blue");
  });

  test("updateStyleAttribute updates existing CSS property", () => {
    const attributes = { style: "color: red; font-size: 14px" };
    updateStyleAttribute(attributes, "color", "blue");

    assert.ok(attributes.style.includes("color: blue"));
    assert.ok(attributes.style.includes("font-size: 14px"));
  });

  test("updateStyleAttribute converts camelCase to kebab-case", () => {
    const attributes: Record<string, string> = {};
    updateStyleAttribute(attributes, "backgroundColor", "blue");
    updateStyleAttribute(attributes, "borderTopWidth", "2px");
    updateStyleAttribute(attributes, "paddingTop", "10px");

    assert.ok(attributes.style.includes("background-color: blue"));
    assert.ok(attributes.style.includes("border-top-width: 2px"));
    assert.ok(attributes.style.includes("padding-top: 10px"));
  });

  test("updateStyleAttribute removes property when value is empty", () => {
    const attributes = { style: "color: red; background-color: blue" };
    updateStyleAttribute(attributes, "backgroundColor", "");

    assert.ok(!attributes.style.includes("background-color"));
    assert.ok(attributes.style.includes("color: red"));
  });

  test("modifyElementProperty updates simple element with new style", () => {
    const elementText = '<div class="test">Content</div>';
    const result = modifyElementProperty(
      elementText,
      "backgroundColor",
      "blue"
    );

    assert.ok(result);
    assert.ok(result.includes('style="background-color: blue"'));
    assert.ok(result.includes("<div"));
    assert.ok(result.includes('class="test"'));
    assert.ok(result.includes(">Content</div>"));
  });

  test("modifyElementProperty updates element with existing style", () => {
    const elementText = '<div class="test" style="color: red;">Content</div>';
    const result = modifyElementProperty(
      elementText,
      "backgroundColor",
      "blue"
    );

    assert.ok(result);
    assert.ok(result.includes("color: red"));
    assert.ok(result.includes("background-color: blue"));
  });

  test("modifyElementProperty handles self-closing elements", () => {
    const elementText = '<img src="test.jpg" alt="test" />';
    const result = modifyElementProperty(elementText, "width", "100px");

    assert.ok(result);
    assert.ok(result.includes('style="width: 100px"'));
    assert.ok(result.includes("<img"));
    assert.ok(result.includes('src="test.jpg"'));
  });

  test("modifyElementProperty handles complex nested content", () => {
    const elementText =
      '<div class="container"><span>Nested</span><p>Content</p></div>';
    const result = modifyElementProperty(elementText, "padding", "20px");

    assert.ok(result);
    assert.ok(result.includes('style="padding: 20px"'));
    assert.ok(result.includes("<span>Nested</span><p>Content</p></div>"));
  });

  test("modifyElementProperty handles different property types", () => {
    const elementText = "<div>Content</div>";

    // Numeric property
    let result = modifyElementProperty(elementText, "width", "100px");
    assert.ok(result?.includes("width: 100px"));

    // Color property
    result = modifyElementProperty(elementText, "backgroundColor", "#ff0000");
    assert.ok(result?.includes("background-color: #ff0000"));

    // Enum property
    result = modifyElementProperty(elementText, "display", "flex");
    assert.ok(result?.includes("display: flex"));
  });

  test("modifyElementProperty returns null for invalid element", () => {
    const invalidElement = "not an element";
    const result = modifyElementProperty(invalidElement, "width", "100px");

    assert.strictEqual(result, null);
  });

  test("property change workflow integration", () => {
    // Test the complete workflow of property changes
    const originalElement =
      '<div class="test-class" id="test-id">Original Content</div>';

    // Apply multiple property changes
    let modified = modifyElementProperty(
      originalElement,
      "backgroundColor",
      "blue"
    );
    assert.ok(modified?.includes("background-color: blue"));

    modified = modifyElementProperty(modified!, "width", "200px");
    assert.ok(modified?.includes("background-color: blue"));
    assert.ok(modified?.includes("width: 200px"));

    modified = modifyElementProperty(modified!, "display", "flex");
    assert.ok(modified?.includes("background-color: blue"));
    assert.ok(modified?.includes("width: 200px"));
    assert.ok(modified?.includes("display: flex"));

    // Verify original attributes are preserved
    assert.ok(modified?.includes('class="test-class"'));
    assert.ok(modified?.includes('id="test-id"'));
    assert.ok(modified?.includes(">Original Content</div>"));
  });

  test("CSS property name conversion", () => {
    const testCases = [
      { input: "backgroundColor", expected: "background-color" },
      { input: "borderTopWidth", expected: "border-top-width" },
      { input: "paddingTop", expected: "padding-top" },
      { input: "marginLeft", expected: "margin-left" },
      { input: "flexDirection", expected: "flex-direction" },
      { input: "justifyContent", expected: "justify-content" },
      { input: "alignItems", expected: "align-items" },
      { input: "positionType", expected: "position-type" },
    ];

    testCases.forEach(({ input, expected }) => {
      const attributes: Record<string, string> = {};
      updateStyleAttribute(attributes, input, "test-value");
      assert.ok(
        attributes.style.includes(`${expected}: test-value`),
        `Expected ${input} to convert to ${expected}`
      );
    });
  });
});
