import type { Preview } from "@storybook/react-vite"
import "../src/index.css"

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "light",
      values: [
        {
          name: "light",
          value: "#fbfaf7",
        },
        {
          name: "dark",
          value: "#16140f",
        },
      ],
    },
    chromatic: {
      viewports: [375, 768, 1280],
      pauseAnimationAtEnd: true,
      delay: 200,
    },
    a11y: {
      config: {
        rules: [
          {
            id: "color-contrast",
            enabled: true,
          },
        ],
      },
    },
  },
}

export default preview
