package com.bpm.inteligente;

import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.mapping.context.MappingContext;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.convert.MongoConverter;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@SpringBootTest(properties = "spring.main.allow-bean-definition-overriding=true")
@Import(BpmInteligenteApplicationTests.TestConfig.class)
class BpmInteligenteApplicationTests {

    @TestConfiguration
    static class TestConfig {
        @Bean
        public MongoTemplate mongoTemplate() {
            MongoTemplate mockTemplate = Mockito.mock(MongoTemplate.class);
            MongoConverter mockConverter = Mockito.mock(MongoConverter.class);
            org.springframework.data.projection.ProjectionFactory mockProjectionFactory = 
                Mockito.mock(org.springframework.data.projection.ProjectionFactory.class);
            
            org.springframework.data.mongodb.core.mapping.MongoMappingContext mappingContext = 
                new org.springframework.data.mongodb.core.mapping.MongoMappingContext();
            
            org.springframework.data.mongodb.core.convert.MongoCustomConversions conversions = 
                new org.springframework.data.mongodb.core.convert.MongoCustomConversions(java.util.Collections.emptyList());
            mappingContext.setSimpleTypeHolder(conversions.getSimpleTypeHolder());
            
            mappingContext.afterPropertiesSet();
            Mockito.when(mockTemplate.getConverter()).thenReturn(mockConverter);
            Mockito.doReturn(mappingContext).when(mockConverter).getMappingContext();
            Mockito.doReturn(mockProjectionFactory).when(mockConverter).getProjectionFactory();
            return mockTemplate;
        }

        @Bean
        public RedisConnectionFactory redisConnectionFactory() {
            RedisConnectionFactory mockFactory = Mockito.mock(RedisConnectionFactory.class);
            RedisConnection mockConnection = Mockito.mock(RedisConnection.class);
            Mockito.when(mockFactory.getConnection()).thenReturn(mockConnection);
            return mockFactory;
        }

        @Bean
        public RedisMessageListenerContainer redisMessageListenerContainer() {
            return Mockito.mock(RedisMessageListenerContainer.class);
        }
    }

    @Test
    void contextLoads() {
    }
}
