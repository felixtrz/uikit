// Type definitions for UIKit components
export interface UIKitBaseComponent {
  userData: Record<string, unknown>
  classList: {
    add(styles: Record<string, unknown>): void
  }
}

export interface Text extends UIKitBaseComponent {
  // Text-specific properties
}

export interface Container extends UIKitBaseComponent {
  add(child: UIKitBaseComponent): void
  // Container-specific properties
}

export interface Image extends UIKitBaseComponent {
  // Image-specific properties
}

export interface Svg extends UIKitBaseComponent {
  // Svg-specific properties
}

export interface Video extends UIKitBaseComponent {
  // Video-specific properties
}

export interface Input extends UIKitBaseComponent {
  // Input-specific properties
}

/**
 * Component factory interface for UIKit components
 */
export interface ComponentFactory {
  createText(props: { text: string } & Record<string, unknown>): Text
  createContainer(props: Record<string, unknown>): Container | Text // Can be optimized to Text
  createImage(props: Record<string, unknown>): Image
  createSvg(props: Record<string, unknown>): Svg
  createVideo(props: Record<string, unknown>): Video
  createInput(props: Record<string, unknown>): Input
}

/**
 * UIKit components bundle interface - using constructor functions
 */
export interface UIKitComponents {
  Text: new (props?: any) => Text
  Container: new (props?: any) => Container
  Image: new (props?: any) => Image
  Svg: new (props?: any) => Svg
  Video: new (props?: any) => Video
  Input: new (props?: any) => Input
}

/**
 * UIKit-specific component factory
 * Creates components using @pmndrs/uikit classes
 */
export class UIKitComponentFactory implements ComponentFactory {
  private components: UIKitComponents

  constructor(uikitComponents: UIKitComponents) {
    this.components = uikitComponents
  }

  createText(props: { text: string } & Record<string, unknown>): Text {
    const component = new this.components.Text(props)
    if (!component.userData) {
      component.userData = {}
    }
    Object.assign(component.userData, props)

    if (!component.classList) {
      component.classList = {
        add: () => {
          // Default implementation
        },
      }
    }
    return component
  }

  createContainer(props: Record<string, unknown>): Container {
    const component = new this.components.Container(props)
    if (!component.userData) {
      component.userData = {}
    }
    Object.assign(component.userData, props)

    if (!component.classList) {
      component.classList = {
        add: () => {
          // Default implementation
        },
      }
    }
    return component
  }

  createImage(props: Record<string, unknown>): Image {
    const component = new this.components.Image(props)
    if (!component.userData) {
      component.userData = {}
    }
    Object.assign(component.userData, props)

    if (!component.classList) {
      component.classList = {
        add: () => {
          // Default implementation
        },
      }
    }
    return component
  }

  createSvg(props: Record<string, unknown>): Svg {
    const component = new this.components.Svg(props)
    if (!component.userData) {
      component.userData = {}
    }
    Object.assign(component.userData, props)

    if (!component.classList) {
      component.classList = {
        add: () => {
          // Default implementation
        },
      }
    }
    return component
  }

  createVideo(props: Record<string, unknown>): Video {
    const component = new this.components.Video(props)
    if (!component.userData) {
      component.userData = {}
    }
    Object.assign(component.userData, props)

    if (!component.classList) {
      component.classList = {
        add: () => {
          // Default implementation
        },
      }
    }
    return component
  }

  createInput(props: Record<string, unknown>): Input {
    const component = new this.components.Input(props)
    if (!component.userData) {
      component.userData = {}
    }
    Object.assign(component.userData, props)

    if (!component.classList) {
      component.classList = {
        add: () => {
          // Default implementation
        },
      }
    }
    return component
  }
}

/**
 * Convenience function to create a UIKit factory with the standard components
 */
export function createUIKitFactory(uikitComponents: UIKitComponents): UIKitComponentFactory {
  return new UIKitComponentFactory(uikitComponents)
}
