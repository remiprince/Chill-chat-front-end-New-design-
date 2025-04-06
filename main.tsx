import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set page title
document.title = "ChillChat | Groovy Conversations with Strangers";

createRoot(document.getElementById("root")!).render(<App />);
