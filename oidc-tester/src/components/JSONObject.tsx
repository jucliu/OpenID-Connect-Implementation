/** Renders any object as its JSON serialization in a <Code> block. */
import Code from "./Code";

export default function JSONObject({ obj }: { obj: any }) {
  return <Code>{JSON.stringify(obj, null, 4)}</Code>;
}
