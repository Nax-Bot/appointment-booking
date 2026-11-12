"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import { useSession } from "@/context/session-context";
import { applyTone, LoaderTone } from "@/lib/lib-front/lottie-theme";

import spinner from "@/assets/lottie/spinner.json";
import dots from "@/assets/lottie/dots.json";
import search from "@/assets/lottie/search.json";
import people from "@/assets/lottie/people.json";
import calendar from "@/assets/lottie/calendar.json";
import clock from "@/assets/lottie/clock.json";
import list from "@/assets/lottie/list.json";
import sun from "@/assets/lottie/sun.json";
import slots from "@/assets/lottie/slots.json";
import profile from "@/assets/lottie/profile.json";
import badge from "@/assets/lottie/badge.json";
import pulse from "@/assets/lottie/pulse.json";

// lottie-web a besoin du navigateur (document) : on le charge seulement côté client.
// Adaptateur compatible avec les deux versions de lottie-react :
//  - 2.x : export par défaut, l'animation se passe dans la prop "animationData"
//  - 3.x : export nommé "Lottie", l'animation se passe dans la prop "src"
interface LottieAdapterProps {
    data: object;
    size: number;
}

const Lottie = dynamic<LottieAdapterProps>(
    () =>
        import("lottie-react").then((module) => {
            const lib = module as unknown as Record<string, unknown>;
            const isV3 = lib.default === undefined && lib.Lottie !== undefined;
            const Player = (isV3 ? lib.Lottie : lib.default) as ComponentType<Record<string, unknown>>;

            return function LottieAdapter({ data, size }: LottieAdapterProps) {
                const style = { width: size, height: size };
                if (isV3) {
                    return <Player src={data} loop autoplay style={style} />;
                }
                return <Player animationData={data} loop autoplay style={style} />;
            };
        }),
    { ssr: false }
);

const ANIMATIONS = { spinner, dots, search, people, calendar, clock, list, sun, slots, profile, badge, pulse };

export type LoaderKind = keyof typeof ANIMATIONS;

// kind = quelle animation. tone = couleurs (par défaut : celles du rôle connecté).
// size = taille en pixels. label = texte sous l'animation (facultatif).
interface LottieLoaderProps {
    kind: LoaderKind;
    tone?: LoaderTone;
    size?: number;
    label?: string;
    className?: string;
}

export default function LottieLoader({ kind, tone, size = 120, label, className = "" }: LottieLoaderProps) {
    const { user } = useSession();

    let finalTone: LoaderTone = "client";
    if (tone !== undefined) {
        finalTone = tone;
    } else if (user !== null && user.role === "PROFESSIONAL") {
        finalTone = "pro";
    }

    const data = useMemo(() => applyTone(ANIMATIONS[kind], finalTone), [kind, finalTone]);

    return (
        <div
            role="status"
            aria-live="polite"
            className={"flex flex-col items-center justify-center " + className}
        >
            <div style={{ width: size, height: size }}>
                <Lottie data={data} size={size} />
            </div>
            {label !== undefined && (
                <p className="animate-soft-pulse mt-1 text-sm font-medium text-muted">{label}</p>
            )}
            <span className="sr-only">{label !== undefined ? label : "Chargement"}</span>
        </div>
    );
}
