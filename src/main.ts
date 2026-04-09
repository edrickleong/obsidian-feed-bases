import { Plugin } from "obsidian";
import { FeedView, FeedViewType } from "./feed-view";

export default class ObsidianFeedPlugin extends Plugin {
  onload() {
    this.registerBasesView(FeedViewType, {
      name: "Feed",
      icon: "lucide-newspaper",
      factory: (controller, containerEl) =>
        new FeedView(controller, containerEl),
      options: () => [
        {
          key: "showProperties",
          type: "toggle",
          displayName: "Show note properties (experimental)",
          default: false,
        },
        {
          key: "multipleColumns",
          type: "toggle",
          displayName: "Show notes in multiple columns (experimental)",
          default: false,
        },
        {
          key: "maxCardWidth",
          type: "slider",
          displayName: "Maximum card width (experimental)",
          default: 400,
          min: 200,
          max: 800,
          step: 10,
        },
      ],
    });
  }

  onunload() {}
}
