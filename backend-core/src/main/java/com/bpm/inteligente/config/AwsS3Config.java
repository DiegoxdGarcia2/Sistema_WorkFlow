package com.bpm.inteligente.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

import software.amazon.awssdk.core.client.config.ClientOverrideConfiguration;
import software.amazon.awssdk.core.retry.RetryPolicy;

@Configuration
public class AwsS3Config {

    @Value("${aws.credentials.access-key:}")
    private String accessKey;

    @Value("${aws.credentials.secret-key:}")
    private String secretKey;

    @Value("${aws.s3.region:us-east-1}")
    private String region;

    @Bean
    public S3Client s3Client() {
        // Permitir un fallback local/mock para no romper el inicio de la app si no hay llaves reales
        String awsAccessKey = (accessKey == null || accessKey.trim().isEmpty() || accessKey.equals("mock_access_key")) 
                ? "mockAccessKey" : accessKey;
        String awsSecretKey = (secretKey == null || secretKey.trim().isEmpty() || secretKey.equals("mock_secret_key")) 
                ? "mockSecretKey" : secretKey;
        String awsRegion = (region == null || region.trim().isEmpty()) ? "us-east-1" : region;

        return S3Client.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(awsAccessKey, awsSecretKey)))
                .overrideConfiguration(ClientOverrideConfiguration.builder()
                        .retryPolicy(RetryPolicy.builder().numRetries(0).build())
                        .build())
                .build();
    }

    @Bean
    public software.amazon.awssdk.services.s3.presigner.S3Presigner s3Presigner() {
        String awsAccessKey = (accessKey == null || accessKey.trim().isEmpty() || accessKey.equals("mock_access_key")) 
                ? "mockAccessKey" : accessKey;
        String awsSecretKey = (secretKey == null || secretKey.trim().isEmpty() || secretKey.equals("mock_secret_key")) 
                ? "mockSecretKey" : secretKey;
        String awsRegion = (region == null || region.trim().isEmpty()) ? "us-east-1" : region;

        return software.amazon.awssdk.services.s3.presigner.S3Presigner.builder()
                .region(Region.of(awsRegion))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(awsAccessKey, awsSecretKey)))
                .build();
    }
}

