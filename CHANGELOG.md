# Changelog

## [2026-02-13] - WhatsApp Messaging Fixes

### Fixed
- **Database Schema**: Added missing `whatsappConnectionType` and `externalChatId` columns to `leads` table that were preventing WhatsApp messages from being stored
  - Migration file: `0035_fix_leads_whatsapp_fields.sql`
  - Error: `ER_BAD_FIELD_ERROR: Unknown column 'externalChatId' in 'field list'`
  
- **React Hooks Violation**: Fixed "Rendered more hooks than during the previous render" error in ChatList component
  - File: `client/src/components/chat/ChatList.tsx`
  - Issue: `useMemo` hooks were called after conditional returns, violating React's Rules of Hooks
  - Solution: Moved all hook declarations before conditional returns

### Verified
- ✅ WhatsApp messages are now received and stored correctly in database
- ✅ Message handler creates leads and conversations without errors
- ✅ Baileys integration working properly
- ✅ Frontend chat list renders without React errors

### Testing
Tested with incoming WhatsApp message from +595981082830:
```
[MessageHandler] Received notify msg 3EB0507B16D24488F0B45D from 595981082830@s.whatsapp.net
[MessageHandler] Saved notify msg 3EB0507B16D24488F0B45D for Lead 1 in Conversation 1
```
