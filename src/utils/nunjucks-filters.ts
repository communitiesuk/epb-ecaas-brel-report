import type { Environment } from "nunjucks";

export function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(`${dateStr}T00:00:00`);
  if (isNaN(date.getTime())) return dateStr;

  function getOrdinalSuffix(day: number): string {
    if (day > 3 && day < 21) return "th";
    switch (day % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  }

  const day = date.getDate();
  const month = date.toLocaleDateString("en-GB", { month: "long" });
  const year = date.getFullYear();

  return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
}

export function formatEnergySources(energySources?: string[]): string {
  if (!energySources?.length) return "";

  const energySourceNames: Record<string, string> = {
    mains_gas: "Mains gas",
    electricity: "electricity",
    LPG_bulk: "LPG bulk",
    LPG_bottled: "LPG bottled",
    LPG_condition_11F: "LPG condition 11F",
  };

  const formattedSources = energySources.map((source) => energySourceNames[source] ?? source);

  if (formattedSources.length === 1) {
    return formattedSources[0];
  }

  const lastSource = formattedSources.pop();

  return `${formattedSources.join(", ")} and ${lastSource}`;
}

export const filters: Record<string, (...args: any[]) => any> = {
  formatDate,
  formatEnergySources,
};

export function registerFilters(env: Environment): void {
  for (const [name, filterFn] of Object.entries(filters)) {
    env.addFilter(name, filterFn);
  }
}
