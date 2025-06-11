import * as assert from "assert";
import * as vscode from "vscode";
import { Parser } from "../../extension/parse";

suite("Parser Mapping Test Suite", () => {
  let parser: Parser;

  setup(() => {
    parser = new Parser();
  });

  test("getRangeInfo returns undefined for non-existent keys", () => {
    const result = parser.getRangeInfo("non-existent");
    assert.strictEqual(result, undefined);
  });

  test("Parser instance is created successfully", () => {
    assert.ok(parser instanceof Parser);
  });

  // Test the internal mapping functionality without async parsing
  test("Element map stores and retrieves ranges", () => {
    // Access the private map through any type assertion for testing
    const parserAny = parser as any;

    // Manually add a test mapping
    parserAny.elementMap.set("test-id", {
      start: new vscode.Position(0, 0),
      end: new vscode.Position(0, 10),
    });

    const range = parser.getRangeInfo("test-id");
    assert.ok(range);
    assert.strictEqual(range.start.line, 0);
    assert.strictEqual(range.start.character, 0);
    assert.strictEqual(range.end.line, 0);
    assert.strictEqual(range.end.character, 10);
  });

  test("Class map stores and retrieves ranges", () => {
    // Access the private map through any type assertion for testing
    const parserAny = parser as any;

    // Manually add a test mapping
    parserAny.classMap.set("test-class", {
      start: new vscode.Position(1, 5),
      end: new vscode.Position(1, 15),
    });

    const range = parser.getRangeInfo("test-class");
    assert.ok(range);
    assert.strictEqual(range.start.line, 1);
    assert.strictEqual(range.start.character, 5);
    assert.strictEqual(range.end.line, 1);
    assert.strictEqual(range.end.character, 15);
  });
});

suite("Parser Integration Test Suite", () => {
  let parser: Parser;

  setup(() => {
    parser = new Parser();
  });

  test("Preserves data-uid attributes in parsed result", async () => {
    const html = `<style>
  .panel-container {
    align-items: flex-start;
    padding: 2;
  }
</style>
<div class="panel-container">
  <span class="heading">Settings</span>
</div>`;

    const result = await parser.parse(html);

    // console.log('Parse result:', JSON.stringify(result, null, 2));

    assert.ok(result, "Should parse HTML");
    assert.ok(result.element, "Should have element property");

    // Check that data-uid is preserved in the element properties
    const element = result.element;
    assert.strictEqual(element.type, "container", "Root should be a container");
    assert.ok(element.properties, "Should have properties");
    assert.ok(
      element.properties["data-uid"] || element.properties["dataUid"],
      "Should have data-uid property"
    );
    assert.strictEqual(
      element.properties["data-uid"] || element.properties["dataUid"],
      "eid-1",
      "First element should have eid-1"
    );

    // Check that child elements also have data-uid
    if (element.children && element.children.length > 0) {
      const firstChild = element.children[0];
      if (typeof firstChild === "object") {
        assert.ok(
          firstChild.properties["data-uid"] || firstChild.properties["dataUid"],
          "Child should have data-uid"
        );
        assert.strictEqual(
          firstChild.properties["data-uid"] || firstChild.properties["dataUid"],
          "eid-2",
          "First child should have eid-2"
        );
      }
    }
  });

  test("ID-based styles are extracted and inlined", async () => {
    const html = `<style>
  #main-header {
    background-color: blue;
    font-size: 24px;
  }
  #sub-header {
    color: red;
    margin: 10px;
  }
  .regular-class {
    padding: 5px;
  }
</style>
<div id="main-header">Main Header</div>
<div id="sub-header" style="border: 1px solid black">Sub Header</div>
<div class="regular-class">Regular Class</div>`;

    const result = await parser.parse(html);

    assert.ok(result, "Should parse HTML with ID styles");
    assert.ok(result.element, "Should have element property");

    // The root element is likely a container, find the divs
    const rootElement = result.element;
    assert.ok(rootElement, "Should have root element");

    // Find the first div with id="main-header"
    let mainHeaderDiv;
    if (rootElement.children) {
      mainHeaderDiv = rootElement.children.find(
        (child: any) =>
          typeof child === "object" &&
          child.properties &&
          child.properties.id === "main-header"
      );
    }

    assert.ok(mainHeaderDiv, "Should find main-header div");
    assert.ok(
      mainHeaderDiv.properties.style,
      "Main header div should have style property"
    );
    assert.strictEqual(
      mainHeaderDiv.properties.style.backgroundColor,
      "blue",
      "Should include background-color"
    );
    assert.strictEqual(
      mainHeaderDiv.properties.style.fontSize,
      "24px",
      "Should include font-size"
    );

    // The second div should have merged styles
    if (rootElement.children && rootElement.children.length > 0) {
      const secondDiv = rootElement.children.find(
        (child: any) =>
          typeof child === "object" &&
          child.properties &&
          child.properties.id === "sub-header"
      );
      assert.ok(secondDiv, "Should find sub-header div");
      assert.ok(
        secondDiv.properties.style,
        "Second div should have style property"
      );
      assert.strictEqual(
        secondDiv.properties.style.border,
        "1px solid black",
        "Should preserve existing styles"
      );
      assert.strictEqual(
        secondDiv.properties.style.color,
        "red",
        "Should include color from ID selector"
      );
      assert.strictEqual(
        secondDiv.properties.style.margin,
        "10px",
        "Should include margin from ID selector"
      );
    }
  });

  test("getRangeInfo works with eid-{elementId} for ID styles", async () => {
    const html = `<style>
  #test-id {
    color: green;
    padding: 20px;
  }
</style>
<div id="test-id">Test Element</div>`;

    await parser.parse(html);

    // The parser should store ID style locations
    const idStyleRange = parser.getRangeInfo("eid-test-id");
    assert.ok(idStyleRange, "Should have range info for ID style");
    assert.strictEqual(
      idStyleRange.start.line,
      1,
      "ID style should start on line 1"
    );

    // Regular element ID lookup should still work
    const elementRange = parser.getRangeInfo("eid-1");
    assert.ok(elementRange, "Should have range info for element");
  });

  test("Parse settings.uikitml file content", async () => {
    // Using a subset of settings.uikitml content
    const settingsContent = `<style>
.panel-container {
  align-items: flex-start;
  padding: 2;
  width: 50;
  display: flex;
  flex-direction: column;
  background-color: #09090b;
  border-color: #27272a;
  border-width: 0.15;
  border-radius: 1.5;
}

.heading {
  font-size: 4;
  font-weight: medium;
  color: #fafafa;
  text-align: left;
}
</style>
<div class="panel-container">
  <span class="heading">Locomotion Demo</span>
  <div id="comfort-assist" class="settings-entry">
    <span class="button-group-label">Comfort Assist</span>
  </div>
</div>`;

    const result = await parser.parse(settingsContent);

    assert.ok(result, "Should parse settings content");
    assert.ok(result.element, "Should have element");

    // Verify data-uid attributes are present
    const rootElement = result.element;
    assert.ok(
      rootElement.properties["data-uid"] || rootElement.properties["dataUid"],
      "Root element should have data-uid"
    );

    // Verify we can get range info for the generated IDs
    const rootRange = parser.getRangeInfo(
      rootElement.properties["data-uid"] || rootElement.properties["dataUid"]
    );
    assert.ok(rootRange, "Should have range info for root element");

    // Verify class mapping works
    const panelRange = parser.getRangeInfo("panel-container");
    assert.ok(panelRange, "Should have range for panel-container class");
    assert.strictEqual(
      panelRange.start.line,
      1,
      "panel-container should be on line 1"
    );

    const headingRange = parser.getRangeInfo("heading");
    assert.ok(headingRange, "Should have range for heading class");
  });
});
