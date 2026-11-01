export type ToolStatus = "Prototype";
export type Tool = { id: string; name: string; path: string; summary: string; status: ToolStatus };

/** Link to the external suggestion form. Duffy creates the form and supplies the address.
 *  The production build fails while this still contains the placeholder marker. */
export const SUGGESTION_FORM_URL = "https://REPLACE_ME.example/suggest-a-tool";

export const tools: Tool[] = [
  {
    id: "iep",
    name: "IEP Goal Toolkit",
    path: "/iep/",
    summary: "Progress graphs, deadline dates, and goal wording checks. Saved only in your browser.",
    status: "Prototype",
  },
  {
    id: "timer",
    name: "Classroom Pie Timer",
    path: "/timer/",
    summary: "Split a lesson into colorful slices of one big ring. Set the time for each activity and watch it move.",
    status: "Prototype",
  },
  {
    id: "garden",
    name: "Class Garden",
    path: "/garden/",
    summary: "Grow a garden together. Set a class goal, and watch it bloom as the class gets closer.",
    status: "Prototype",
  },
  {
    id: "aquarium",
    name: "Quiet Aquarium",
    path: "/aquarium/",
    summary: "Fish grow and rare ones appear the longer your class stays calm. Listens to volume only. Nothing is recorded.",
    status: "Prototype",
  },
  {
    id: "schedule",
    name: "Visual Schedule Board",
    path: "/schedule/",
    summary: "Picture cards that show what is happening now and what is next. Print it or put it on the classroom screen.",
    status: "Prototype",
  },
];
