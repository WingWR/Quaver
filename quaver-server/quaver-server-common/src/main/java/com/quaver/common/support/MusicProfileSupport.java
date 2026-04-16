package com.quaver.common.support;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

public final class MusicProfileSupport {

    private static final List<String> MOODS = List.of("focus", "chill", "deep", "boost");

    private MusicProfileSupport() {
    }

    public static String inferMood(String seed) {
        String normalized = seed == null ? "" : seed;
        int score = 0;
        for (int index = 0; index < normalized.length(); index++) {
            score += normalized.charAt(index) * (index + 1);
        }
        return MOODS.get(Math.floorMod(score, MOODS.size()));
    }

    public static String accentForMood(String mood) {
        return switch (mood) {
            case "boost" -> "#FFB547";
            case "deep" -> "#7B61FF";
            case "focus" -> "#4BC0FF";
            default -> "#1DB954";
        };
    }

    public static String createArtwork(String label, String startColor, String endColor) {
        String safeLabel = abbreviate(label);
        String svg = """
                <svg xmlns='http://www.w3.org/2000/svg' width='320' height='320' viewBox='0 0 320 320' fill='none'>
                  <rect width='320' height='320' rx='32' fill='%s'/>
                  <circle cx='238' cy='84' r='92' fill='%s' fill-opacity='0.92'/>
                  <path d='M108 214V132L214 118V194' stroke='white' stroke-opacity='0.9' stroke-width='18' stroke-linecap='round' stroke-linejoin='round'/>
                  <circle cx='106' cy='218' r='18' fill='white' fill-opacity='0.94'/>
                  <circle cx='212' cy='198' r='18' fill='white' fill-opacity='0.94'/>
                  <text x='34' y='284' fill='white' fill-opacity='0.94' font-family='Arial,sans-serif' font-size='30' font-weight='700'>%s</text>
                </svg>
                """.formatted(startColor, endColor, safeLabel);
        return "data:image/svg+xml;charset=UTF-8," + URLEncoder.encode(svg, StandardCharsets.UTF_8);
    }

    public static String createTrackArtwork(String seed) {
        String mood = inferMood(seed);
        String accent = accentForMood(mood);
        return createArtwork(seed, accent, darken(accent));
    }

    public static String createPlaylistCover(String seed) {
        String mood = inferMood("playlist:" + seed);
        String accent = accentForMood(mood);
        return createArtwork(seed, darken(accent), accent);
    }

    private static String darken(String color) {
        return switch (color) {
            case "#FFB547" -> "#7A4C00";
            case "#7B61FF" -> "#2D1D7A";
            case "#4BC0FF" -> "#0A3E5D";
            default -> "#073A1E";
        };
    }

    private static String abbreviate(String label) {
        if (label == null || label.isBlank()) {
            return "QV";
        }
        String trimmed = label.trim();
        return trimmed.length() <= 8 ? trimmed : trimmed.substring(0, 8);
    }
}
