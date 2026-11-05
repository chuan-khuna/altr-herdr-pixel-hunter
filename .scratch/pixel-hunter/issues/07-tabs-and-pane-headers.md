# 07: Tabs and pane headers with Hunter faces

**What to build:** The tab bar and every pane header carry the Hunters.

- Each tab shows a 24 px face of its first Hunter (a map icon when the tab has no agent), its name and a state dot. The current tab is framed in mint.
- Files and Changes buttons on the right open Herdr's shipped panels in the side panel, remembered per space.
- Each pane header shows the Hunter's face, Class, Rank (or the program name until ticket 06 lands), folder, branch and state label.
- The focused pane is framed mint. A pane whose Hunter Needs help is framed peach, and peach wins over focus.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Tabs behave like Herdr's shipped tabs (select, rename, move, new, close) with faces and dots added
- [ ] Files and Changes open and close the side panel, which is remembered per space
- [ ] Pane headers update live with folder, branch and state
- [ ] A focused pane that Needs help shows the peach frame, not mint
- [ ] `herdr-app check` passes; a `herdr-app shot` matches the tab bar and panes in the preview record
