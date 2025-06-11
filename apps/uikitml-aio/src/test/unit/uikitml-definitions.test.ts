import {
  isValidHTMLTag,
  isValidCustomElement,
  isValidAttribute,
  isValidCSSProperty,
  getHTMLTagCompletions,
  getAttributeCompletions,
  getCSSPropertyCompletions,
  SUPPORTED_HTML_TAGS,
  VOID_ELEMENTS,
  SUPPORTED_ATTRIBUTES,
  SUPPORTED_CSS_PROPERTIES
} from '../../shared/uikitml-definitions';

describe('UIKitML Definitions', () => {
  
  describe('HTML Tag Validation', () => {
    it('All supported HTML tags should be valid', () => {
      const supportedTags = [
        'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'a', 'button', 'ul', 'ol', 'li', 'textarea', 'input',
        'img', 'video', 'svg', 'style'
      ];
      
      supportedTags.forEach(tag => {
        expect(isValidHTMLTag(tag)).to.be.true;
      });
    });

    it('Unsupported HTML tags should be invalid', () => {
      const unsupportedTags = [
        'table', 'tr', 'td', 'th', 'tbody', 'thead', 'tfoot',
        'form', 'select', 'option', 'fieldset', 'legend',
        'iframe', 'script', 'link', 'meta', 'canvas',
        'audio', 'embed', 'object', 'param'
      ];
      
      unsupportedTags.forEach(tag => {
        expect(isValidHTMLTag(tag)).to.be.false;
      });
    });

    it('HTML tag validation should be case-insensitive', () => {
      expect(isValidHTMLTag('DIV')).to.be.true;
      expect(isValidHTMLTag('Div')).to.be.true;
      expect(isValidHTMLTag('BUTTON')).to.be.true;
      expect(isValidHTMLTag('TABLE')).to.be.false;
      expect(isValidHTMLTag('Table')).to.be.false;
    });

    it('Void elements should be properly identified', () => {
      expect(VOID_ELEMENTS.has('img')).to.be.true;
      expect(VOID_ELEMENTS.has('input')).to.be.true;
      expect(VOID_ELEMENTS.has('div')).to.be.false;
      expect(VOID_ELEMENTS.has('button')).to.be.false;
    });
  });

  describe('Custom Element Validation', () => {
    it('Valid custom elements should pass validation', () => {
      const validCustomElements = [
        'ui-button',
        'my-component',
        'app-header',
        'custom-element-name',
        'x-tag',
        'a-b',
        'element-with-multiple-hyphens'
      ];
      
      validCustomElements.forEach(element => {
        expect(isValidCustomElement(element)).to.be.true;
      });
    });

    it('Invalid custom elements should fail validation', () => {
      const invalidCustomElements = [
        'CustomElement',      // Capital letters
        'CUSTOM-ELEMENT',     // All caps
        'custom_element',     // Underscore
        'customElement',      // No hyphen
        'custom',             // No hyphen
        '123-element',        // Starts with number
        '-element',           // Starts with hyphen
        'element-',           // Ends with hyphen
        'elem--ent',          // Double hyphen
        'my-Component',       // Capital after hyphen
        ''                    // Empty string
      ];
      
      invalidCustomElements.forEach(element => {
        expect(isValidCustomElement(element)).to.be.false;
      });
    });
  });

  describe('Attribute Validation', () => {
    it('Common HTML attributes should be valid', () => {
      const validAttributes = [
        'id', 'class', 'style', 'title', 'lang', 'dir',
        'src', 'alt', 'width', 'height', 'href', 'target',
        'type', 'name', 'value', 'placeholder', 'disabled',
        'checked', 'selected', 'readonly', 'required'
      ];
      
      validAttributes.forEach(attr => {
        expect(isValidAttribute(attr)).to.be.true;
      });
    });

    it('Data attributes should be valid', () => {
      const dataAttributes = [
        'data-value',
        'data-id',
        'data-test-id',
        'data-my-custom-attribute',
        'data-123'
      ];
      
      dataAttributes.forEach(attr => {
        expect(isValidAttribute(attr)).to.be.true;
      });
    });

    it('Aria attributes should be valid', () => {
      const ariaAttributes = [
        'aria-label',
        'aria-labelledby',
        'aria-describedby',
        'aria-hidden',
        'aria-expanded',
        'aria-controls'
      ];
      
      ariaAttributes.forEach(attr => {
        expect(isValidAttribute(attr)).to.be.true;
      });
    });

    it('Event attributes should be valid', () => {
      const eventAttributes = [
        'onclick',
        'onchange',
        'onsubmit',
        'onmouseover',
        'onkeydown',
        'onfocus',
        'onblur'
      ];
      
      eventAttributes.forEach(attr => {
        expect(isValidAttribute(attr)).to.be.true;
      });
    });

    it('Unknown attributes should be invalid', () => {
      const unknownAttributes = [
        'unknown',
        'custom-attr',
        'my-attribute',
        'ng-model',
        'v-model',
        'x-data'
      ];
      
      unknownAttributes.forEach(attr => {
        expect(isValidAttribute(attr)).to.be.false;
      });
    });

    it('Attribute validation should be case-insensitive', () => {
      expect(isValidAttribute('ID')).to.be.true;
      expect(isValidAttribute('Class')).to.be.true;
      expect(isValidAttribute('DATA-VALUE')).to.be.true;
      expect(isValidAttribute('ARIA-LABEL')).to.be.true;
      expect(isValidAttribute('onClick')).to.be.true;
    });
  });

  describe('CSS Property Validation', () => {
    it('Layout properties should be valid', () => {
      const layoutProperties = [
        'display', 'position', 'top', 'left', 'right', 'bottom',
        'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
        'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
        'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'
      ];
      
      layoutProperties.forEach(prop => {
        expect(isValidCSSProperty(prop)).to.be.true;
      });
    });

    it('Flexbox properties should be valid', () => {
      const flexProperties = [
        'flex-direction', 'justify-content', 'align-items', 'align-content',
        'flex-wrap', 'flex', 'flex-grow', 'flex-shrink', 'flex-basis',
        'align-self', 'order', 'gap', 'row-gap', 'column-gap'
      ];
      
      flexProperties.forEach(prop => {
        expect(isValidCSSProperty(prop)).to.be.true;
      });
    });

    it('Typography properties should be valid', () => {
      const typographyProperties = [
        'font-family', 'font-size', 'font-weight', 'font-style',
        'line-height', 'text-align', 'text-decoration', 'text-transform',
        'letter-spacing', 'word-spacing', 'color'
      ];
      
      typographyProperties.forEach(prop => {
        expect(isValidCSSProperty(prop)).to.be.true;
      });
    });

    it('Visual properties should be valid', () => {
      const visualProperties = [
        'background', 'background-color', 'background-image',
        'border', 'border-width', 'border-style', 'border-color',
        'border-radius', 'opacity', 'visibility', 'overflow',
        'cursor', 'z-index'
      ];
      
      visualProperties.forEach(prop => {
        expect(isValidCSSProperty(prop)).to.be.true;
      });
    });

    it('Unknown CSS properties should be invalid', () => {
      const unknownProperties = [
        'unknown-property',
        'custom-prop',
        'webkit-fake',
        'moz-invalid',
        'ms-notreal',
        'invalid-css'
      ];
      
      unknownProperties.forEach(prop => {
        expect(isValidCSSProperty(prop)).to.be.false;
      });
    });

    it('CSS property validation should be case-insensitive', () => {
      expect(isValidCSSProperty('DISPLAY')).to.be.true;
      expect(isValidCSSProperty('Background-Color')).to.be.true;
      expect(isValidCSSProperty('FLEX-DIRECTION')).to.be.true;
    });
  });

  describe('Completion Functions', () => {
    it('HTML tag completions should return sorted array', () => {
      const completions = getHTMLTagCompletions();
      
      expect(Array.isArray(completions)).to.be.true;
      expect(completions.length).to.be.greaterThan(0);
      expect(completions).to.include('div');
      expect(completions).to.include('button');
      
      // Check if sorted
      const sorted = [...completions].sort();
      expect(completions).to.deep.equal(sorted);
    });

    it('Attribute completions should be context-aware', () => {
      const imgAttrs = getAttributeCompletions('img');
      expect(imgAttrs).to.include('src');
      expect(imgAttrs).to.include('alt');
      expect(imgAttrs).to.include('width');
      
      const linkAttrs = getAttributeCompletions('a');
      expect(linkAttrs).to.include('href');
      expect(linkAttrs).to.include('target');
      
      const inputAttrs = getAttributeCompletions('input');
      expect(inputAttrs).to.include('type');
      expect(inputAttrs).to.include('placeholder');
      
      const divAttrs = getAttributeCompletions('div');
      expect(divAttrs).to.include('id');
      expect(divAttrs).to.include('class');
    });

    it('CSS property completions should return sorted array', () => {
      const completions = getCSSPropertyCompletions();
      
      expect(Array.isArray(completions)).to.be.true;
      expect(completions.length).to.be.greaterThan(0);
      expect(completions).to.include('display');
      expect(completions).to.include('flex-direction');
      
      // Check if sorted
      const sorted = [...completions].sort();
      expect(completions).to.deep.equal(sorted);
    });
  });

  describe('Set Collections', () => {
    it('SUPPORTED_HTML_TAGS should contain all valid tags', () => {
      expect(SUPPORTED_HTML_TAGS.size).to.be.greaterThan(0);
      expect(SUPPORTED_HTML_TAGS.has('div')).to.be.true;
      expect(SUPPORTED_HTML_TAGS.has('style')).to.be.true;
      expect(SUPPORTED_HTML_TAGS.has('table')).to.be.false;
    });

    it('SUPPORTED_ATTRIBUTES should contain common attributes', () => {
      expect(SUPPORTED_ATTRIBUTES.size).to.be.greaterThan(0);
      expect(SUPPORTED_ATTRIBUTES.has('id')).to.be.true;
      expect(SUPPORTED_ATTRIBUTES.has('class')).to.be.true;
    });

    it('SUPPORTED_CSS_PROPERTIES should contain common properties', () => {
      expect(SUPPORTED_CSS_PROPERTIES.size).to.be.greaterThan(0);
      expect(SUPPORTED_CSS_PROPERTIES.has('display')).to.be.true;
      expect(SUPPORTED_CSS_PROPERTIES.has('flex-direction')).to.be.true;
    });
  });
});