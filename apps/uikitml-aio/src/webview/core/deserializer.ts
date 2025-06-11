import { ElementJson } from '@pmndrs/uikitml'
import { Container, Image, Input, Text, Video, Svg } from '@pmndrs/uikit'

/**
 * Applies CSS classes to an element
 */
function applyCSSClasses(
  element: any, // Use any to avoid complex Three.js type conflicts
  properties: Record<string, any>,
  classes: Record<string, any>
) {
  if (properties.class) {
    const classNames = (properties.class as string).split(' ')
    classNames.forEach((className) => {
      const styleClass = classes[className]
      if (styleClass) {
        element.classList.add(styleClass)
      }
    })
  }
}

/**
 * Comprehensive deserializer for UIKitML parser output
 * Handles all 6 element types: container, custom, image, svg, video, input
 * Note: inline-svg is handled as Svg with content property
 */
export function deserialize(
  json: ElementJson | string,
  classes: Record<string, Record<string, string>>,
): any {
  // Handle null input
  if (json === null || json === undefined) {
    return null
  }

  // Handle text nodes
  if (typeof json === 'string') {
    const textElement = new Text({ text: json })
    return textElement
  }

  // Merge properties with style object if present
  const properties = { ...json.properties }
  if (properties.style && typeof properties.style === 'object') {
    Object.assign(properties, properties.style)
    delete properties.style
  }

  // Merge default properties from parser
  if (json.defaultProperties) {
    Object.assign(properties, json.defaultProperties, properties)
  }

  const uid: string | undefined = properties.dataUid
  const elementId: string | undefined = properties.id
  let element: any

  switch (json.type) {
    case 'container':
      element = createContainerElement(json, properties)
      // If the container was optimized to a Text element, we need to apply classes before returning
      if (element instanceof Text) {
        // Set userData for tracking
        element.userData.uid = uid
        if (elementId) {
          element.userData.id = elementId
        }
        // Store original source tag for debugging
        if (json.sourceTag) {
          element.userData.sourceTag = json.sourceTag
        }
        
        // Apply CSS classes to the optimized Text element
        applyCSSClasses(element, properties, classes)
        
        return element
      }
      break

    case 'custom':
      element = createCustomElement(json, properties)
      break

    case 'image':
      element = createImageElement(json, properties)
      break

    case 'svg':
      element = createSvgElement(json, properties)
      break

    case 'inline-svg':
      element = createInlineSvgElement(json, properties)
      break

    case 'video':
      element = createVideoElement(json, properties)
      break

    case 'input':
      element = createInputElement(json, properties)
      break

    default:
      // Fallback to container for unknown types
      console.warn(`Unknown element type: ${(json as any).type}, falling back to container`)
      element = new Container(properties)
      break
  }

  // Set userData for tracking
  element.userData.uid = uid
  if (elementId) {
    element.userData.id = elementId
  }

  // Store original source tag for debugging
  if (json.sourceTag) {
    element.userData.sourceTag = json.sourceTag
  }

  // Apply CSS classes
  applyCSSClasses(element, properties, classes)

  // Add children for container and custom elements
  if ('children' in json && json.children) {
    json.children.forEach((childElementJson: any) => {
      const childElement = deserialize(childElementJson, classes)
      if (childElement) {
        element.add(childElement)
      }
    })
  }

  return element
}

function createContainerElement(
  json: ElementJson & { type: 'container' },
  properties: Record<string, any>,
): any {
  // Optimization: if container has only one child and it's a string,
  // create a Text element directly instead of a Container with a Text child
  if (json.children && json.children.length === 1 && typeof json.children[0] === 'string') {
    return new Text({ ...properties, text: json.children[0] })
  }

  return new Container(properties)
}

function createCustomElement(json: ElementJson & { type: 'custom' }, properties: Record<string, any>): any {
  // For custom elements, we fall back to Container since we don't have
  // the actual custom component implementations available
  // In a real application, this would lookup the component in a registry
  const element = new Container(properties)

  // Store custom element metadata
  element.userData.customElement = {
    kit: json.kit,
    name: json.name,
    sourceTag: json.sourceTag,
  }

  console.log(`Custom element ${json.kit}-${json.name} rendered as Container`)
  return element
}

function createImageElement(_json: ElementJson & { type: 'image' }, properties: Record<string, any>): any {
  // Ensure required src property exists
  if (!properties.src) {
    console.warn('Image element missing src property')
    properties.src = '' // Fallback to empty string
  }

  return new Image(properties as any)
}

function createSvgElement(_json: ElementJson & { type: 'svg' }, properties: Record<string, any>): any {
  // Ensure required src property exists for SVG
  if (!properties.src) {
    console.warn('SVG element missing src property')
    properties.src = '' // Fallback to empty string
  }

  return new Svg(properties)
}

function createInlineSvgElement(json: ElementJson & { type: 'inline-svg' }, properties: Record<string, any>): any {
  // Use the text content from the parser for inline SVG
  const svgText = json.text || ''

  return new Svg({
    ...properties,
    content: svgText, // Use content property for inline SVG
  })
}

function createVideoElement(_json: ElementJson & { type: 'video' }, properties: Record<string, any>): any {
  // Ensure required src property exists
  if (!properties.src) {
    console.warn('Video element missing src property')
    properties.src = '' // Fallback to empty string
  }

  return new Video(properties)
}

function createInputElement(json: ElementJson & { type: 'input' }, properties: Record<string, any>): any {
  // Handle textarea conversion (parser sets multiline: true for textareas)
  if (json.sourceTag === 'textarea' && !properties.multiline) {
    properties.multiline = true
  }

  return new Input(properties)
}

/**
 * Helper function to get a human-readable description of an element
 * Useful for debugging and logging
 */
export function getElementDescription(json: ElementJson | string): string {
  if (typeof json === 'string') {
    return `Text: "${json.substring(0, 20)}${json.length > 20 ? '...' : ''}"`
  }

  switch (json.type) {
    case 'container':
      return `Container (${json.sourceTag})`
    case 'custom':
      return `Custom: ${json.kit}-${json.name} (${json.sourceTag})`
    case 'image':
      return `Image: ${json.properties?.src || 'no src'}`
    case 'svg':
      return `SVG: ${json.properties?.src || 'no src'}`
    case 'inline-svg':
      return `Inline SVG (${json.text?.length || 0} chars)`
    case 'video':
      return `Video: ${json.properties?.src || 'no src'}`
    case 'input':
      return `Input (${json.sourceTag}${json.properties?.multiline ? ', multiline' : ''})`
    default:
      return `Unknown: ${(json as any).type}`
  }
}
