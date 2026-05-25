package com.banque.digital_banking;

import com.banque.digital_banking.chatbot.RagIndexingService;
import com.banque.digital_banking.chatbot.TelegramBotService;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

/**
 * Smoke test — verifies the Spring application context starts without errors.
 *
 * RagIndexingService and TelegramBotService are mocked to prevent outbound
 * HTTP calls to OpenAI and Telegram during tests (dummy credentials in
 * src/test/resources/application.properties would cause HTTP 401 / connection
 * errors otherwise).
 */
@SpringBootTest
class DigitalBankingApplicationTests {

    /** Prevents the ApplicationReadyEvent listener from calling OpenAI embeddings. */
    @MockBean
    private RagIndexingService ragIndexingService;

    /** Prevents the Telegram long-polling bot from connecting to the Telegram API. */
    @MockBean
    private TelegramBotService telegramBotService;

    @Test
    void contextLoads() {
        // If the context starts without exception, the test passes.
    }
}
