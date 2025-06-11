import * as assert from "assert";
import { modifyElementProperty } from "../../extension/extension";

suite("Property Change Integration Test Suite", () => {
  test("Complete property editing workflow", () => {
    // Start with a basic element
    const originalHtml = '<div class="container" id="main">Content here</div>';

    // Apply multiple property changes as would happen in real usage
    let result = modifyElementProperty(originalHtml, "width", "200px");
    assert.ok(result?.includes("width: 200px"));
    assert.ok(result?.includes('class="container"'));
    assert.ok(result?.includes('id="main"'));

    // Add background color
    result = modifyElementProperty(result!, "backgroundColor", "#ff0000");
    assert.ok(result?.includes("width: 200px"));
    assert.ok(result?.includes("background-color: #ff0000"));

    // Add flex display
    result = modifyElementProperty(result!, "display", "flex");
    assert.ok(result?.includes("width: 200px"));
    assert.ok(result?.includes("background-color: #ff0000"));
    assert.ok(result?.includes("display: flex"));

    // Add padding
    result = modifyElementProperty(result!, "paddingTop", "20px");
    assert.ok(result?.includes("width: 200px"));
    assert.ok(result?.includes("background-color: #ff0000"));
    assert.ok(result?.includes("display: flex"));
    assert.ok(result?.includes("padding-top: 20px"));

    // Verify original attributes and content are preserved
    assert.ok(result?.includes('class="container"'));
    assert.ok(result?.includes('id="main"'));
    assert.ok(result?.includes(">Content here</div>"));
  });

  test("Property editing with existing styles", () => {
    const originalHtml = '<div style="margin: 10px; color: blue;">Test</div>';

    // Modify existing property
    let result = modifyElementProperty(originalHtml, "color", "red");
    assert.ok(result?.includes("color: red"));
    assert.ok(result?.includes("margin: 10px"));
    assert.ok(!result?.includes("color: blue"));

    // Add new property
    result = modifyElementProperty(result!, "width", "150px");
    assert.ok(result?.includes("color: red"));
    assert.ok(result?.includes("margin: 10px"));
    assert.ok(result?.includes("width: 150px"));
  });

  test("Property removal by setting empty value", () => {
    const originalHtml =
      '<div style="width: 100px; height: 50px; color: red;">Test</div>';

    // Remove width property
    const result = modifyElementProperty(originalHtml, "width", "");
    assert.ok(!result?.includes("width:"));
    assert.ok(result?.includes("height: 50px"));
    assert.ok(result?.includes("color: red"));
  });

  test("Complex element with multiple attributes", () => {
    const originalHtml =
      '<div class="test" id="complex" data-testid="element" disabled>Complex element</div>';

    const result = modifyElementProperty(
      originalHtml,
      "backgroundColor",
      "yellow"
    );

    // Verify all original attributes preserved
    assert.ok(result?.includes('class="test"'));
    assert.ok(result?.includes('id="complex"'));
    assert.ok(result?.includes('data-testid="element"'));
    assert.ok(result?.includes("disabled"));

    // Verify new style added
    assert.ok(result?.includes('style="background-color: yellow"'));

    // Verify content preserved
    assert.ok(result?.includes(">Complex element</div>"));
  });

  test("Self-closing element property changes", () => {
    const originalHtml = '<img src="test.jpg" alt="Test image" width="100" />';

    const result = modifyElementProperty(originalHtml, "opacity", "0.8");

    // Verify original attributes preserved
    assert.ok(result?.includes('src="test.jpg"'));
    assert.ok(result?.includes('alt="Test image"'));
    assert.ok(result?.includes('width="100"'));

    // Verify new style added
    assert.ok(result?.includes('style="opacity: 0.8"'));

    // Verify self-closing format preserved
    assert.ok(result?.includes("/>"));
  });

  test("Property change error handling", () => {
    // Invalid HTML should return null
    const invalidHtml = "Not a valid HTML element";
    const result = modifyElementProperty(invalidHtml, "width", "100px");
    assert.strictEqual(result, null);

    // Text node should return null
    const textNode = "Just some text";
    const result2 = modifyElementProperty(textNode, "color", "red");
    assert.strictEqual(result2, null);
  });

  test("All supported property types work correctly", () => {
    const originalHtml = "<div>Test</div>";

    // Test numeric properties
    const numericProps = [
      "width",
      "height",
      "paddingTop",
      "marginTop",
      "opacity",
    ];
    for (const prop of numericProps) {
      const result = modifyElementProperty(originalHtml, prop, "10px");
      const expectedCss = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
      assert.ok(
        result?.includes(`${expectedCss}: 10px`),
        `Property ${prop} should be converted to ${expectedCss}`
      );
    }

    // Test color properties
    const colorProps = ["backgroundColor", "color", "borderColor"];
    for (const prop of colorProps) {
      const result = modifyElementProperty(originalHtml, prop, "#ff0000");
      const expectedCss = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
      assert.ok(
        result?.includes(`${expectedCss}: #ff0000`),
        `Property ${prop} should be converted to ${expectedCss}`
      );
    }

    // Test enum properties
    const enumProps = [
      { prop: "display", value: "flex" },
      { prop: "flexDirection", value: "column" },
      { prop: "justifyContent", value: "center" },
      { prop: "alignItems", value: "stretch" },
    ];
    for (const { prop, value } of enumProps) {
      const result = modifyElementProperty(originalHtml, prop, value);
      const expectedCss = prop.replace(/([A-Z])/g, "-$1").toLowerCase();
      assert.ok(
        result?.includes(`${expectedCss}: ${value}`),
        `Property ${prop} should be converted to ${expectedCss}`
      );
    }
  });
});
