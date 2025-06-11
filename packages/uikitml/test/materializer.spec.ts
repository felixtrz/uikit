import { expect } from 'chai'
import { materialize, createUIKitFactory } from '../src/index.js'

// Mock UIKit components for testing
const mockComponents = {
  Text: class Text {
    public properties: { value: any } = { value: {} }
    public userData: any = {}
    public classList = {
      add: function(styles: any) {
        if (!this._addedClasses) this._addedClasses = []
        this._addedClasses.push(styles)
      },
      _addedClasses: [] as any[]
    }

    constructor(props: any) {
      this.properties.value = { ...props }
    }
  },
  Container: class Container {
    public properties: { value: any } = { value: {} }
    public userData: any = {}
    public children: any[] = []
    public classList = {
      add: function(styles: any) {
        if (!this._addedClasses) this._addedClasses = []
        this._addedClasses.push(styles)
      },
      _addedClasses: [] as any[]
    }

    constructor(props: any) {
      this.properties.value = { ...props }
    }

    add(child: any) {
      this.children.push(child)
    }
  },
  Image: class Image {
    public userData: any = {}
    public classList = {
      add: function(styles: any) {
        if (!this._addedClasses) this._addedClasses = []
        this._addedClasses.push(styles)
      },
      _addedClasses: [] as any[]
    }
    constructor(props: any) {}
  },
  Svg: class Svg {
    public userData: any = {}
    public classList = {
      add: function(styles: any) {
        if (!this._addedClasses) this._addedClasses = []
        this._addedClasses.push(styles)
      },
      _addedClasses: [] as any[]
    }
    constructor(props: any) {}
  },
  Video: class Video {
    public userData: any = {}
    public classList = {
      add: function(styles: any) {
        if (!this._addedClasses) this._addedClasses = []
        this._addedClasses.push(styles)
      },
      _addedClasses: [] as any[]
    }
    constructor(props: any) {}
  },
  Input: class Input {
    public userData: any = {}
    public classList = {
      add: function(styles: any) {
        if (!this._addedClasses) this._addedClasses = []
        this._addedClasses.push(styles)
      },
      _addedClasses: [] as any[]
    }
    constructor(props: any) {}
  }
}

describe('materializer', () => {
  const factory = createUIKitFactory(mockComponents)
  const mockClasses = {
    'test-class': {
      color: 'red',
      padding: '10px',
    },
    'another-class': {
      fontSize: '14px',
    },
  }

  describe('container optimization', () => {
    it('should optimize single-child container to Text element', () => {
      const containerJson = {
        type: 'container',
        sourceTag: 'div',
        properties: {
          dataUid: 'test-uid',
          id: 'test-id',
          class: 'test-class another-class',
        },
        children: ['Text with styling'],
      }

      const result = materialize(containerJson, mockClasses, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Text)
      expect(result.properties.value.text).to.equal('Text with styling')
      expect(result.userData.uid).to.equal('test-uid')
      expect(result.userData.id).to.equal('test-id')
      expect(result.userData.sourceTag).to.equal('div')
      expect(result.classList._addedClasses).to.have.length(2)
    })

    it('should not optimize container with multiple children', () => {
      const containerJson = {
        type: 'container',
        sourceTag: 'div',
        properties: {
          class: 'test-class',
        },
        children: ['First text', 'Second text'],
      }

      const result = materialize(containerJson, mockClasses, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Container)
      expect(result.classList._addedClasses).to.have.length(1)
    })

    it('should preserve CSS classes in optimized Text element', () => {
      const containerJson = {
        type: 'container',
        sourceTag: 'p',
        properties: {
          class: 'unknown-class test-class',
        },
        children: ['Text with mixed classes'],
      }

      const result = materialize(containerJson, mockClasses, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Text)
      expect(result.classList._addedClasses).to.have.length(1)
      expect(result.classList._addedClasses[0]).to.deep.equal({
        color: 'red',
        padding: '10px',
      })
    })
  })

  describe('element types', () => {
    it('should materialize container elements', () => {
      const containerJson = {
        type: 'container',
        sourceTag: 'div',
        properties: { class: 'test-class' },
        children: [],
      }

      const result = materialize(containerJson, mockClasses, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Container)
      expect(result.classList._addedClasses).to.have.length(1)
    })

    it('should materialize image elements', () => {
      const imageJson = {
        type: 'image',
        sourceTag: 'img',
        properties: { src: 'test.jpg', alt: 'Test' },
      }

      const result = materialize(imageJson, {}, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Image)
    })

    it('should materialize svg elements', () => {
      const svgJson = {
        type: 'svg',
        sourceTag: 'svg',
        properties: { src: 'test.svg' },
      }

      const result = materialize(svgJson, {}, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Svg)
    })

    it('should materialize inline svg elements', () => {
      const inlineSvgJson = {
        type: 'inline-svg',
        sourceTag: 'svg',
        properties: {},
        text: '<circle cx="50" cy="50" r="40"/>',
      }

      const result = materialize(inlineSvgJson, {}, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Svg)
    })

    it('should materialize video elements', () => {
      const videoJson = {
        type: 'video',
        sourceTag: 'video',
        properties: { src: 'test.mp4' },
      }

      const result = materialize(videoJson, {}, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Video)
    })

    it('should materialize input elements', () => {
      const inputJson = {
        type: 'input',
        sourceTag: 'input',
        properties: { type: 'text', value: 'test' },
      }

      const result = materialize(inputJson, {}, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Input)
    })

    it('should materialize textarea as input with multiline property', () => {
      const textareaJson = {
        type: 'input',
        sourceTag: 'textarea',
        properties: {},
      }

      const result = materialize(textareaJson, {}, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Input)
    })

    it('should materialize custom elements as containers', () => {
      const customJson = {
        type: 'custom',
        sourceTag: 'mykit-button',
        properties: {},
        children: ['Click me'],
        kit: 'mykit',
        name: 'button',
      }

      const result = materialize(customJson, {}, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Container)
      expect(result.userData.customElement).to.deep.equal({
        kit: 'mykit',
        name: 'button',
        sourceTag: 'mykit-button',
      })
    })

    it('should materialize text strings directly', () => {
      const result = materialize('Hello World', {}, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Text)
      expect(result.properties.value.text).to.equal('Hello World')
    })
  })

  describe('property handling', () => {
    it('should merge style object properties', () => {
      const elementJson = {
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
      }

      const result = materialize(elementJson, mockClasses, factory) as any

      expect(result.properties.value.width).to.equal(100)
      expect(result.properties.value.height).to.equal(50)
      expect(result.classList._addedClasses).to.have.length(1)
    })

    it('should merge default properties from parser', () => {
      const elementJson = {
        type: 'container',
        sourceTag: 'h1',
        properties: {},
        defaultProperties: {
          fontSize: 32,
          fontWeight: 'bold',
        },
        children: ['Title'],
      }

      const result = materialize(elementJson, {}, factory) as any

      expect(result.properties.value.fontSize).to.equal(32)
      expect(result.properties.value.fontWeight).to.equal('bold')
    })

    it('should handle missing required properties gracefully', () => {
      const imageJson = {
        type: 'image',
        sourceTag: 'img',
        properties: {}, // Missing src
      }

      const result = materialize(imageJson, {}, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Image)
    })
  })

  describe('edge cases', () => {
    it('should handle null input', () => {
      const result = materialize(null as any, {}, factory)

      expect(result).to.be.null
    })

    it('should handle undefined input', () => {
      const result = materialize(undefined as any, {}, factory)

      expect(result).to.be.null
    })

    it('should handle empty class strings', () => {
      const elementJson = {
        type: 'container',
        sourceTag: 'div',
        properties: { class: '' },
        children: ['Text content'],
      }

      const result = materialize(elementJson, mockClasses, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Text)
      expect(result.classList._addedClasses).to.have.length(0)
    })

    it('should handle whitespace-only class strings', () => {
      const elementJson = {
        type: 'container',
        sourceTag: 'div',
        properties: { class: '   ' },
        children: ['Text content'],
      }

      const result = materialize(elementJson, mockClasses, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Text)
      expect(result.classList._addedClasses).to.have.length(0)
    })

    it('should handle unknown element types', () => {
      const unknownJson = {
        type: 'unknown-type',
        sourceTag: 'unknown',
        properties: {},
      }

      const result = materialize(unknownJson as any, {}, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Container)
    })
  })

  describe('nested elements', () => {
    it('should materialize nested container structures', () => {
      const nestedJson = {
        type: 'container',
        sourceTag: 'div',
        properties: { class: 'test-class' },
        children: [
          {
            type: 'container',
            sourceTag: 'p',
            properties: {},
            children: ['Hello'],
          },
          {
            type: 'container', 
            sourceTag: 'p',
            properties: {},
            children: ['World'],
          },
        ],
      }

      const result = materialize(nestedJson, mockClasses, factory) as any

      expect(result).to.be.instanceOf(mockComponents.Container)
      expect(result.children).to.have.length(2)
      expect(result.children[0]).to.be.instanceOf(mockComponents.Text)
      expect(result.children[1]).to.be.instanceOf(mockComponents.Text)
      expect(result.classList._addedClasses).to.have.length(1)
    })
  })
})