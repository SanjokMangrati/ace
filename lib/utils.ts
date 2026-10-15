import { createCn } from "cn/config"

export const cn = createCn({
  extend: {
    theme: {
      text: [
        "hero",
        "title-lg",
        "dialog-title",
        "title",
        "name-lg",
        "name",
        "button",
        "prose",
        "body",
        "body-strong",
        "small",
        "caption",
        "code",
        "wordmark",
        "wordmark-lg",
        "letter-xs",
        "letter-sm",
        "letter-md",
        "letter-lg",
        "letter-xl",
      ],
      radius: ["mark", "xs", "check", "tile-xs", "tile", "avatar"],
      shadow: ["card", "pop", "overlay"],
      spacing: ["sidebar", "screen-panel", "control", "control-sm"],
      container: ["thread", "tagline", "intro", "empty"],
      font: ["display"],
      animate: ["breathe"],
      ease: ["spring"],
      breakpoint: ["sidebar"],
    },
  },
})
