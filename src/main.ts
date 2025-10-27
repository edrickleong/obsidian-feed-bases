import { Plugin } from "obsidian";
import { FeedView, FeedViewType } from "./feed-view";

export default class ObsidianFeedPlugin extends Plugin {
  async onload() {
    this.registerBasesView(FeedViewType, {
      name: "Feed",
      icon: "lucide-newspaper",
      factory: (controller, containerEl) =>
        new FeedView(controller, containerEl),
      options: () => [
        {
          key: "showProperties",
          type: "toggle",
          displayName: "Show note properties (Experimental)",
          default: false,
        },
        {
          key: "multipleColumns",
          type: "toggle",
          displayName: "Show notes in multiple columns (Experimental)",
          default: false,
        },
        {
          key: "maxCardWidth",
          type: "slider",
          displayName: "Maximum card width (Experimental)",
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
