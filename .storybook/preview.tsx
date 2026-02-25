import type { Preview } from "@storybook/react";
import React from "react";
import "../client/src/index.css";

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
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
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-background p-4">
        <Story />
      </div>
    ),
  ],
};

export default preview;
