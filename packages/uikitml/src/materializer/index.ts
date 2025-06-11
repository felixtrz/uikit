import { ElementJson } from '../parser/index.js'
import { ComponentFactory, Text, Container, Image, Svg, Video, Input } from './uikit-factory.js'

// Union type for all possible UIKit components
type UIKitComponent = Text | Container | Image | Svg | Video | Input

/**
 * Applies CSS classes to a component
 */
function applyCSSClasses(
  component: UIKitComponent,
  properties: Record<string, unknown>,
  classes: Record<string, Record<string, string>>,
) {
  if (properties.class && typeof properties.class === 'string') {
    const classNames = properties.class.split(' ')
    classNames.forEach((className) => {
      const styleClass = classes[className]
      if (styleClass) {
        component.classList.add(styleClass)
      }
    })
  }
}

/**
 * Materializes UIKitML parser output into UI components
 * Handles all 6 element types: container, custom, image, svg, video, input
 * Note: inline-svg is handled as Svg with content property
 */
export function materialize(
  json: ElementJson | string,
  classes: Record<string, Record<string, string>>,
  factory: ComponentFactory,
): UIKitComponent | null {
  // Handle null input
  if (json === null || json === undefined) {
    return null
  }

  // Handle text nodes
  if (typeof json === 'string') {
    return factory.createText({ text: json })
  }

  // Merge properties with style object if present
  const properties: Record<string, unknown> = { ...json.properties }
  if (properties.style && typeof properties.style === 'object') {
    Object.assign(properties, properties.style)
    delete properties.style
  }

  // Merge default properties from parser
  if (json.defaultProperties) {
    Object.assign(properties, json.defaultProperties, properties)
  }

  const uid = properties.dataUid as string | undefined
  const elementId = properties.id as string | undefined
  let component: UIKitComponent

  switch (json.type) {
    case 'container':
      component = createContainerComponent(json, properties, factory)
      // If the container was optimized to a Text component, we need to apply classes before returning
      if (component && isTextComponent(component, factory)) {
        // Set userData for tracking
        component.userData.uid = uid
        if (elementId) {
          component.userData.id = elementId
        }
        // Store original source tag for debugging
        if (json.sourceTag) {
          component.userData.sourceTag = json.sourceTag
        }

        // Apply CSS classes to the optimized Text component
        applyCSSClasses(component, properties, classes)

        return component
      }
      break

    case 'custom':
      component = createCustomComponent(json, properties, factory)
      break

    case 'image':
      component = createImageComponent(json, properties, factory)
      break

    case 'svg':
      component = createSvgComponent(json, properties, factory)
      break

    case 'inline-svg':
      component = createInlineSvgComponent(json, properties, factory)
      break

    case 'video':
      component = createVideoComponent(json, properties, factory)
      break

    case 'input':
      component = createInputComponent(json, properties, factory)
      break

    default:
      // Fallback to container for unknown types
      console.warn(`Unknown element type: ${(json as any).type}, falling back to container`)
      component = factory.createContainer(properties)
      break
  }

  if (!component) {
    return null
  }

  // Set userData for tracking
  component.userData.uid = uid
  if (elementId) {
    component.userData.id = elementId
  }

  // Store original source tag for debugging
  if (json.sourceTag) {
    component.userData.sourceTag = json.sourceTag
  }

  // Apply CSS classes
  applyCSSClasses(component, properties, classes)

  // Add children for container and custom elements
  if ('children' in json && json.children && 'add' in component) {
    json.children.forEach((childElementJson) => {
      const childComponent = materialize(childElementJson, classes, factory)
      if (childComponent) {
        ;(component as Container).add(childComponent)
      }
    })
  }

  return component
}

function createContainerComponent(
  json: ElementJson & { type: 'container' },
  properties: Record<string, unknown>,
  factory: ComponentFactory,
): UIKitComponent {
  // Optimization: if container has only one child and it's a string,
  // create a Text component directly instead of a Container with a Text child
  if (json.children && json.children.length === 1 && typeof json.children[0] === 'string') {
    return factory.createText({ ...properties, text: json.children[0] })
  }

  return factory.createContainer(properties)
}

function createCustomComponent(
  json: ElementJson & { type: 'custom' },
  properties: Record<string, unknown>,
  factory: ComponentFactory,
): UIKitComponent {
  // For custom elements, we fall back to Container since we don't have
  // the actual custom component implementations available
  // In a real application, this would lookup the component in a registry
  const component = factory.createContainer(properties)

  // Store custom element metadata
  component.userData.customElement = {
    kit: json.kit,
    name: json.name,
    sourceTag: json.sourceTag,
  }

  console.log(`Custom element ${json.kit}-${json.name} rendered as Container`)
  return component
}

function createImageComponent(
  _json: ElementJson & { type: 'image' },
  properties: Record<string, unknown>,
  factory: ComponentFactory,
): UIKitComponent {
  // Ensure required src property exists
  if (!properties.src) {
    console.warn('Image element missing src property')
    properties.src = '' // Fallback to empty string
  }

  return factory.createImage(properties)
}

function createSvgComponent(
  _json: ElementJson & { type: 'svg' },
  properties: Record<string, unknown>,
  factory: ComponentFactory,
): UIKitComponent {
  // Ensure required src property exists for SVG
  if (!properties.src) {
    console.warn('SVG element missing src property')
    properties.src = '' // Fallback to empty string
  }

  return factory.createSvg(properties)
}

function createInlineSvgComponent(
  json: ElementJson & { type: 'inline-svg' },
  properties: Record<string, unknown>,
  factory: ComponentFactory,
): UIKitComponent {
  // Use the text content from the parser for inline SVG
  const svgText = json.text || ''

  return factory.createSvg({
    ...properties,
    content: svgText, // Use content property for inline SVG
  })
}

function createVideoComponent(
  _json: ElementJson & { type: 'video' },
  properties: Record<string, unknown>,
  factory: ComponentFactory,
): UIKitComponent {
  // Ensure required src property exists
  if (!properties.src) {
    console.warn('Video element missing src property')
    properties.src = '' // Fallback to empty string
  }

  return factory.createVideo(properties)
}

function createInputComponent(
  json: ElementJson & { type: 'input' },
  properties: Record<string, unknown>,
  factory: ComponentFactory,
): UIKitComponent {
  // Handle textarea conversion (parser sets multiline: true for textareas)
  if (json.sourceTag === 'textarea' && !properties.multiline) {
    properties.multiline = true
  }

  return factory.createInput(properties)
}

// Helper function to check if a component is a Text component
// This is a simple heuristic - in practice, you might want a more robust type check
function isTextComponent(component: UIKitComponent, factory: ComponentFactory): boolean {
  // Create a test text component to compare
  const testText = factory.createText({ text: 'test' })
  return component.constructor === testText.constructor
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
