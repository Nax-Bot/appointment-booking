"use client";

import { WEEK_DAYS } from "@/lib/lib-front/days";

// Sept pastilles Lun ... Dim : on clique pour cocher ou décocher un jour.
// selectedDays = les jours cochés (valeurs du backend : 0 = dimanche ... 6 = samedi)
interface DayPickerProps {
    selectedDays: number[];
    onChange: (days: number[]) => void;
    error?: string;
}

export default function DayPicker({ selectedDays, onChange, error = "" }: DayPickerProps) {
    function isSelected(day: number): boolean {
        for (const selectedDay of selectedDays) {
            if (selectedDay === day) {
                return true;
            }
        }
        return false;
    }

    // Un clic sur une pastille : on la coche si elle ne l'est pas, sinon on la décoche
    function toggle(day: number) {
        if (isSelected(day)) {
            const remaining: number[] = [];
            for (const selectedDay of selectedDays) {
                if (selectedDay !== day) {
                    remaining.push(selectedDay);
                }
            }
            onChange(remaining);
        } else {
            onChange([...selectedDays, day]);
        }
    }

    // Raccourci : lundi à vendredi
    function selectWeekdays() {
        onChange([1, 2, 3, 4, 5]);
    }

    return (
        <div className="mb-4">
            <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium text-ink">Jours de la semaine</span>
                <button
                    type="button"
                    onClick={selectWeekdays}
                    className="text-xs font-medium text-primary underline"
                >
                    Lundi – vendredi
                </button>
            </div>

            <div className="flex flex-wrap gap-2">
                {/* map = une pastille par jour */}
                {WEEK_DAYS.map((day) => {
                    const selected = isSelected(day.value);

                    let pillClass = "border-line bg-white text-ink hover:bg-tint";
                    if (selected) {
                        pillClass = "border-primary bg-primary text-white";
                    }

                    return (
                        <button
                            key={day.value}
                            type="button"
                            aria-pressed={selected}
                            aria-label={day.label}
                            onClick={() => toggle(day.value)}
                            className={
                                "h-10 w-12 rounded-lg border text-sm font-medium transition-colors " + pillClass
                            }
                        >
                            {day.short}
                        </button>
                    );
                })}
            </div>

            {error !== "" && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );
}