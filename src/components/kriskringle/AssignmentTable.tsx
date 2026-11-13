import type { Assignment } from "../../types/draw";

type AssignmentTableProps = {
	/** Read by screen readers only; the surrounding heading shows it visually. */
	caption: string;
	assignments: readonly Assignment[];
};

export function AssignmentTable({
	caption,
	assignments,
}: AssignmentTableProps) {
	return (
		<table className="w-full text-left text-sm">
			<caption className="sr-only">{caption}</caption>
			<thead>
				<tr className="border-b border-line text-ink-muted">
					<th scope="col" className="w-1/2 py-2 pr-4 font-medium">
						Giver
					</th>
					<th scope="col" className="w-1/2 py-2 font-medium">
						Gives to
					</th>
				</tr>
			</thead>
			<tbody>
				{assignments.map(({ giver, receiver }) => (
					<tr
						key={`${giver}\u0000${receiver}`}
						className="border-b border-line last:border-b-0"
					>
						<th scope="row" className="py-2 pr-4 font-semibold">
							{giver}
						</th>
						<td className="py-2">{receiver}</td>
					</tr>
				))}
			</tbody>
		</table>
	);
}
