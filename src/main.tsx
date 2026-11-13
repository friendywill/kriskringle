import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import "./styles/global.css";

const router = createRouter({ routeTree });

// Declaration merging is how TanStack Router learns the app's route types.
declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("root");
if (rootElement === null) {
	throw new Error('index.html is missing the <div id="root"> mount point.');
}

createRoot(rootElement).render(
	<StrictMode>
		<RouterProvider router={router} />
	</StrictMode>,
);
