import { test, expect } from '@playwright/test';
import path from 'path';

test('fase4 e2e: login, helpdesk, enviar texto, subir archivo, generar qr, mock webhook', async ({ page }) => {
  // Dev login (creates/updates a local owner user)
  await page.goto('/api/dev/login');
  await page.waitForLoadState('networkidle');

  // Seed required data
  const seedRes = await page.request.post('/api/test/seed', {
    data: {
      phoneNumber: '+595900000000',
      displayName: 'E2E Number',
    },
  });
  expect(seedRes.ok()).toBeTruthy();
  const seed = await seedRes.json();

  // Create an inbound message (simulates an incoming ticket)
  const inboundRes = await page.request.post('/api/test/mock-inbound-message', {
    data: {
      whatsappNumberId: seed.whatsappNumberId,
      contactPhone: '+595981234567',
      contactName: 'Cliente E2E',
      text: 'hola desde webhook',
    },
  });
  expect(inboundRes.ok()).toBeTruthy();
  const { conversationId } = await inboundRes.json();

  // Open Helpdesk and open the conversation
  await page.goto('/helpdesk');
  await page.getByTestId(`helpdesk-conversation-${conversationId}`).click();

  // Send a text message
  await page.getByTestId('chat-input').fill('mensaje e2e');
  await page.getByTestId('send-button').click();
  await expect(page.locator('text=mensaje e2e')).toBeVisible();

  // Upload & send a document
  const fixture = path.join(__dirname, '..', 'fixtures', 'sample.pdf');
  await page.setInputFiles('[data-testid="file-input"]', fixture);
  await expect(page.locator('text=sample.pdf')).toBeVisible();

  // Generate QR (mocked)
  await page.goto('/monitoring');
  await page.getByTestId(`number-actions-${seed.whatsappNumberId}`).click();
  await page.getByTestId(`connect-whatsapp-${seed.whatsappNumberId}`).click();
  await page.getByTestId('generate-qr').click();
  await expect(page.locator('text=QR generado')).toBeVisible();

  // Receive a webhook mock via the same code path as Meta webhook handler
  const webhookRes = await page.request.post('/api/test/mock-webhook-meta', {
    data: {
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: seed.phoneNumberId },
                contacts: [{ wa_id: '595981234567', profile: { name: 'Cliente E2E' } }],
                messages: [
                  { from: '595981234567', id: String(Date.now()), timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'nuevo mensaje webhook' } },
                ],
              },
            },
          ],
        },
      ],
    },
  });
  expect(webhookRes.ok()).toBeTruthy();

  // Back to Helpdesk and check the new incoming message is visible
  await page.goto('/helpdesk');
  await page.getByTestId(`helpdesk-conversation-${conversationId}`).click();
  await expect(page.locator('text=nuevo mensaje webhook')).toBeVisible();
});
