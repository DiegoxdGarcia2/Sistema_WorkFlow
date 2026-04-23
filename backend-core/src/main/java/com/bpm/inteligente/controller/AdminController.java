package com.bpm.inteligente.controller;

import com.bpm.inteligente.config.DatabaseSeeder;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final MongoTemplate mongoTemplate;
    private final DatabaseSeeder seeder;

    @DeleteMapping("/reset-database")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetDatabase() throws Exception {
        // Drop all collections
        for (String name : mongoTemplate.getCollectionNames()) {
            mongoTemplate.dropCollection(name);
        }
        // Re-run seeder
        seeder.run();
    }
}
