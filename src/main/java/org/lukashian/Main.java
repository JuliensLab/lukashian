package org.lukashian;

public class Main {
    public static void main(String[] args) {
        Instant now = Instant.now();
        System.out.println("Year: " + now.getYear().getYearNumber());
        System.out.println("Day: " + now.getDay().getDayNumber());
        System.out.println("Beeps: " + now.getBeeps());
        System.out.println("Formatted: " + Formatter.format(now));
        System.out.println("Unix: " + now.getUnixEpochMilliseconds());
    }
}