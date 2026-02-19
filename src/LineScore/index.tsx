import * as React from "react";
import { useGameContext } from "../Context";
import { Hit } from "../constants/hitTypes";
import { Wrapper, Table, Th, TeamTh, Td, TeamTd, DividerTd } from "./styles";

/** Returns the run display for a given team/inning cell. */
function getCellValue(
  team: 0 | 1,
  n: number,
  inning: number,
  atBat: 0 | 1,
  gameOver: boolean,
  inningRuns: [number[], number[]],
): string | number {
  // Determine whether this half-inning has started for the given team.
  // Away (0) bats TOP: started if inning >= n.
  // Home (1) bats BOTTOM: started if inning > n, or we're in the bottom of inning n, or game over.
  const hasStarted =
    team === 0
      ? n <= inning
      : n < inning || (n === inning && atBat === 1) || (n === inning && gameOver);
  if (!hasStarted) return "-";
  return inningRuns[team][n - 1] ?? 0;
}

const LineScore: React.FunctionComponent<{}> = () => {
  const { teams, score, inning, atBat, gameOver, inningRuns, playLog } = useGameContext();

  const totalInnings = Math.max(9, inning);
  const inningCols = Array.from({ length: totalInnings }, (_, i) => i + 1);

  const hits = (team: 0 | 1) =>
    playLog.filter(e => e.team === team && e.event !== Hit.Walk).length;

  return (
    <Wrapper>
      <Table>
        <thead>
          <tr>
            <TeamTh>Team</TeamTh>
            {inningCols.map(n => (
              <Th key={n} $accent={n === inning}>{n}</Th>
            ))}
            <DividerTd as="th" />
            <Th $accent>R</Th>
            <Th $accent>H</Th>
          </tr>
        </thead>
        <tbody>
          {([0, 1] as const).map(team => (
            <tr key={team}>
              <TeamTd $active={atBat === team}>{teams[team]}</TeamTd>
              {inningCols.map(n => {
                const val = getCellValue(team, n, inning, atBat, gameOver, inningRuns);
                return (
                  <Td
                    key={n}
                    $active={n === inning && atBat === team}
                    $dim={val === "-"}
                  >
                    {val}
                  </Td>
                );
              })}
              <DividerTd />
              <Td $accent>{score[team]}</Td>
              <Td $accent>{hits(team)}</Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Wrapper>
  );
};

export default LineScore;
