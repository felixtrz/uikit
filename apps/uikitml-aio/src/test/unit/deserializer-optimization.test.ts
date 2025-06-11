import { expect } from 'chai';

// Mock the uikit components since we can't import them in unit tests
const mockComponents = {
  Text: class Text {
    public properties: { value: any } = { value: {} };
    public userData: any = {};
    public classList = {
      add: function(styles: any) {
        // Store added classes for testing
        if (!this._addedClasses) this._addedClasses = [];
        this._addedClasses.push(styles);
      },
      _addedClasses: [] as any[]
    };

    constructor(props: any) {
      this.properties.value = { ...props };
    }
  },
  Container: class Container {
    public properties: { value: any } = { value: {} };
    public userData: any = {};
    public children: any[] = [];
    public classList = {
      add: function(styles: any) {
        if (!this._addedClasses) this._addedClasses = [];
        this._addedClasses.push(styles);
      },
      _addedClasses: [] as any[]
    };

    constructor(props: any) {
      this.properties.value = { ...props };
    }

    add(child: any) {
      this.children.push(child);
    }
  }
};

// Mock the module imports
const mockModule = {
  '@pmndrs/uikit': mockComponents
};

// Function to test (simplified version focusing on the optimization logic)
function createContainerElement(
  json: any,
  properties: Record<string, any>,
): any {
  // Optimization: if container has only one child and it's a string,
  // create a Text element directly instead of a Container with a Text child
  if (json.children && json.children.length === 1 && typeof json.children[0] === 'string') {
    return new mockComponents.Text({ ...properties, text: json.children[0] });
  }

  return new mockComponents.Container(properties);
}

// Simplified deserialize function focusing on the container optimization
function deserializeContainerOptimization(json: any, classes: Record<string, any> = {}) {
  if (!json) return null;

  // Merge properties
  const properties = { ...json.properties };
  if (properties.style && typeof properties.style === 'object') {
    Object.assign(properties, properties.style);
    delete properties.style;
  }

  const uid: string | undefined = properties.dataUid;
  const elementId: string | undefined = properties.id;
  let element: any;

  if (json.type === 'container') {
    element = createContainerElement(json, properties);
    
    // If the container was optimized to a Text element, we need to apply classes before returning
    if (element instanceof mockComponents.Text) {
      // Set userData for tracking
      element.userData.uid = uid;
      if (elementId) {
        element.userData.id = elementId;
      }
      // Store original source tag for debugging
      if (json.sourceTag) {
        element.userData.sourceTag = json.sourceTag;
      }
      
      // Apply CSS classes to the optimized Text element
      if (properties.class) {
        const classNames = (properties.class as string).split(' ');
        classNames.forEach((className) => {
          const styleClass = classes[className];
          if (styleClass) {
            element.classList.add(styleClass);
          }
        });
      }
      
      return element;
    }
  }

  // For non-optimized containers, apply classes here
  if (properties.class) {
    const classNames = (properties.class as string).split(' ');
    classNames.forEach((className) => {
      const styleClass = classes[className];
      if (styleClass) {
        element.classList.add(styleClass);
      }
    });
  }

  return element;
}

describe('Container Optimization with CSS Classes', () => {
  const mockClasses = {
    'test-class': {
      color: 'red',
      padding: '10px',
    },
    'another-class': {
      fontSize: '14px',
    },
  };

  describe('Container with single string child (optimization path)', () => {
    it('should optimize container to Text element and preserve CSS classes', () => {
      const containerWithClasses = {
        type: 'container',
        sourceTag: 'div',
        properties: {
          dataUid: 'test-uid',
          id: 'test-id',
          class: 'test-class another-class',
        },
        children: ['Text with styling'],
      };

      const result = deserializeContainerOptimization(containerWithClasses, mockClasses);

      // Should be optimized to Text element
      expect(result).to.be.instanceOf(mockComponents.Text);
      
      // Should have the text content
      expect(result.properties.value.text).to.equal('Text with styling');
      
      // Should preserve userData
      expect(result.userData.uid).to.equal('test-uid');
      expect(result.userData.id).to.equal('test-id');
      expect(result.userData.sourceTag).to.equal('div');
      
      // Should have CSS classes applied
      expect(result.classList._addedClasses).to.have.length(2);
      expect(result.classList._addedClasses[0]).to.deep.equal({
        color: 'red',
        padding: '10px',
      });
      expect(result.classList._addedClasses[1]).to.deep.equal({
        fontSize: '14px',
      });
    });

    it('should optimize container to Text element even without CSS classes', () => {
      const containerWithoutClasses = {
        type: 'container',
        sourceTag: 'span',
        properties: {
          dataUid: 'no-class-uid',
        },
        children: ['Simple text'],
      };

      const result = deserializeContainerOptimization(containerWithoutClasses, mockClasses);

      // Should be optimized to Text element
      expect(result).to.be.instanceOf(mockComponents.Text);
      
      // Should have the text content
      expect(result.properties.value.text).to.equal('Simple text');
      
      // Should preserve userData
      expect(result.userData.uid).to.equal('no-class-uid');
      expect(result.userData.sourceTag).to.equal('span');
      
      // Should have no CSS classes applied
      expect(result.classList._addedClasses).to.have.length(0);
    });

    it('should handle unknown CSS classes gracefully in optimized Text element', () => {
      const containerWithUnknownClass = {
        type: 'container',
        sourceTag: 'p',
        properties: {
          class: 'unknown-class test-class',
        },
        children: ['Text with mixed classes'],
      };

      const result = deserializeContainerOptimization(containerWithUnknownClass, mockClasses);

      // Should be optimized to Text element
      expect(result).to.be.instanceOf(mockComponents.Text);
      
      // Should only apply known CSS classes (test-class), skip unknown ones
      expect(result.classList._addedClasses).to.have.length(1);
      expect(result.classList._addedClasses[0]).to.deep.equal({
        color: 'red',
        padding: '10px',
      });
    });

    it('should merge style object properties with CSS classes in optimized Text element', () => {
      const containerWithStyleAndClasses = {
        type: 'container',
        sourceTag: 'div',
        properties: {
          class: 'test-class',
          style: {
            width: 100,
            height: 50,
          },
        },
        children: ['Styled text'],
      };

      const result = deserializeContainerOptimization(containerWithStyleAndClasses, mockClasses);

      // Should be optimized to Text element
      expect(result).to.be.instanceOf(mockComponents.Text);
      
      // Should have merged style properties
      expect(result.properties.value.width).to.equal(100);
      expect(result.properties.value.height).to.equal(50);
      expect(result.properties.value.text).to.equal('Styled text');
      
      // Should have CSS classes applied
      expect(result.classList._addedClasses).to.have.length(1);
      expect(result.classList._addedClasses[0]).to.deep.equal({
        color: 'red',
        padding: '10px',
      });
    });
  });

  describe('Container without optimization (normal path)', () => {
    it('should not optimize container with multiple children', () => {
      const containerWithMultipleChildren = {
        type: 'container',
        sourceTag: 'div',
        properties: {
          class: 'test-class',
        },
        children: ['First text', 'Second text'],
      };

      const result = deserializeContainerOptimization(containerWithMultipleChildren, mockClasses);

      // Should NOT be optimized, remain as Container
      expect(result).to.be.instanceOf(mockComponents.Container);
      
      // Should have CSS classes applied to the Container
      expect(result.classList._addedClasses).to.have.length(1);
      expect(result.classList._addedClasses[0]).to.deep.equal({
        color: 'red',
        padding: '10px',
      });
    });

    it('should not optimize container with no children', () => {
      const emptyContainer = {
        type: 'container',
        sourceTag: 'div',
        properties: {
          class: 'test-class',
        },
        children: [],
      };

      const result = deserializeContainerOptimization(emptyContainer, mockClasses);

      // Should NOT be optimized, remain as Container
      expect(result).to.be.instanceOf(mockComponents.Container);
      
      // Should have CSS classes applied to the Container
      expect(result.classList._addedClasses).to.have.length(1);
      expect(result.classList._addedClasses[0]).to.deep.equal({
        color: 'red',
        padding: '10px',
      });
    });

    it('should not optimize container with single non-string child', () => {
      const containerWithObjectChild = {
        type: 'container',
        sourceTag: 'div',
        properties: {
          class: 'test-class',
        },
        children: [{ type: 'image', properties: { src: 'test.jpg' } }],
      };

      const result = deserializeContainerOptimization(containerWithObjectChild, mockClasses);

      // Should NOT be optimized, remain as Container
      expect(result).to.be.instanceOf(mockComponents.Container);
      
      // Should have CSS classes applied to the Container
      expect(result.classList._addedClasses).to.have.length(1);
      expect(result.classList._addedClasses[0]).to.deep.equal({
        color: 'red',
        padding: '10px',
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty class string in optimized Text element', () => {
      const containerWithEmptyClass = {
        type: 'container',
        properties: {
          class: '',
        },
        children: ['Text content'],
      };

      const result = deserializeContainerOptimization(containerWithEmptyClass, mockClasses);

      // Should be optimized to Text element
      expect(result).to.be.instanceOf(mockComponents.Text);
      
      // Should have no CSS classes applied
      expect(result.classList._addedClasses).to.have.length(0);
    });

    it('should handle whitespace-only class string in optimized Text element', () => {
      const containerWithWhitespaceClass = {
        type: 'container',
        properties: {
          class: '   ',
        },
        children: ['Text content'],
      };

      const result = deserializeContainerOptimization(containerWithWhitespaceClass, mockClasses);

      // Should be optimized to Text element
      expect(result).to.be.instanceOf(mockComponents.Text);
      
      // Should have no CSS classes applied (empty class names are ignored)
      expect(result.classList._addedClasses).to.have.length(0);
    });
  });
});