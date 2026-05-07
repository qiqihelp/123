package com.mchelper.data;

import java.util.List;
import java.util.ArrayList;

public class Command {
    private String id;
    private String name;
    private String syntax;
    private String description;
    private CommandCategory category;
    private List<String> examples;
    private String notes;

    public Command(String id, String name, String syntax, String description, 
                   CommandCategory category, List<String> examples, String notes) {
        this.id = id;
        this.name = name;
        this.syntax = syntax;
        this.description = description;
        this.category = category;
        this.examples = examples;
        this.notes = notes;
    }

    public String getId() { return id; }
    public String getName() { return name; }
    public String getSyntax() { return syntax; }
    public String getDescription() { return description; }
    public CommandCategory getCategory() { return category; }
    public List<String> getExamples() { return examples; }
    public String getNotes() { return notes; }
}
