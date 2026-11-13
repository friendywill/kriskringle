import { Alert } from "../ui/Alert";

/** Shown when a save to browser storage did not go through. */
export function StorageErrorAlert() {
	return (
		<Alert tone="error">
			Couldn't save. This browser is blocking storage for this site, so the
			change won't be kept.
		</Alert>
	);
}
