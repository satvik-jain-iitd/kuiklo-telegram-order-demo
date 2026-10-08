# Backlog: epics, stories, Gherkin

<!-- Source: docs/PLAN.md. Edit there, then re-split. -->

## Part C: Backlog (epics, stories, Gherkin)

Each story maps to a test in `docs/tests/test-cases.md`. Stories are named after the spec
priorities P1 to P8. GitHub issues are not used yet (open).

### E1. Text order (P1)
**S1.1 Typed order is parsed.**
```gherkin
Scenario: items, quantities, units and date from one line
  When the customer types "1 kg atta, 2 roti, 3 kg bhindi, kal"
  Then the bot lists atta 1 kg, roti 2 pcs, bhindi 3 kg
  And delivery date is tomorrow in Asia/Kolkata
```
**S1.2 Hindi number words and grams.**
```gherkin
Scenario: "do kilo aloo aur teen roti aadha kilo tamatar"
  Then aloo 2 kg, roti 3, tamatar 0.5 kg
Scenario: "500 gram dahi aur 250g cheeni"
  Then dahi 0.5 kg and cheeni 0.25 kg
```
**S1.3 Unknown words do not crash.**
```gherkin
Scenario: "xyzabc"
  Then the bot says it did not understand and names the unknown word
```

### E2. Voice in (P2)
**S2.1 Voice note is transcribed on Oracle.**
```gherkin
Scenario: OGG voice note
  Given the STT service is up on 127.0.0.1:8787
  When the customer sends a voice note
  Then n8n downloads the file, posts the bytes to /transcribe
  And the text enters the same flow as a typed order
```
**S2.2 Empty transcript.**
```gherkin
Scenario: silence
  When STT returns empty text
  Then the bot asks the customer to send the note again
```

### E3. Missing details (P3)
**S3.1 One question at a time, with buttons.**
```gherkin
Scenario: slot missing
  Given items, brand, and date are known
  Then the bot asks for the slot with Morning and Evening buttons
Scenario: weight item without quantity
  When the customer types "bhindi"
  Then the bot asks "Bhindi kitna chahiye?" with 500 g, 1 kg, 2 kg buttons
```
**S3.2 Brand per item (ADR-010).**
```gherkin
Scenario: atta has four brands
  When the customer orders "1 kg atta kal"
  Then the bot asks "Atta kaunsa brand chahiye?" with four price buttons and "Koi bhi chalega"
Scenario: brand typed with the item
  When the customer types "1 kg pillsbury atta, 2 roti, kal"
  Then Pillsbury is set and the brand is not asked again
```

### E4. Breakdown and Confirm (P4)
**S4.1 Every charge is visible.**
```gherkin
Scenario: subtotal 188
  Then the summary shows Items subtotal ₹188, Delivery fee (demo) ₹25, Handling fee (demo) ₹5, TOTAL ₹218
  And exactly 3 item lines and 4 charge lines carry a rupee sign
  And the word "demo" is present
```
**S4.2 Confirm is a separate tap and saves once.**
```gherkin
Scenario: Confirm tapped twice
  Then one order is saved with id ORD-20261008-0001
Scenario: typed "haan" in REVIEW
  Then it counts as Confirm
```
**S4.3 Phone is masked.**
```gherkin
Scenario: 9812345610 given
  Then the summary shows 98xxxxxx10 and never the full number
```

### E5. Swap window (P5)
```gherkin
Scenario: change at 30 s
  Then the bot asks which item to change
Scenario: change at 61 s
  Then the bot says the time is over and the state is CLOSED
Scenario: Aashirvaad to Pillsbury
  Then the bot shows "Aashirvaad 1 kg ₹48 → Pillsbury 1 kg ₹52 (+₹4)" and "TOTAL: ₹218 → ₹222"
Scenario: cancel change
  Then the original order is unchanged and change_log is empty
Scenario: change confirmed
  Then change_log has one entry, total is 222, and the dispatch message is sent
Scenario: brand typed in the window
  When the customer types "Daawat rozana gold" at 10 s
  Then the change summary shows India Gate to Daawat and the state is SWAP_PENDING
```

### E6. Questions and FAQ (P6)
```gherkin
Scenario: "kitne items"
  Then the bot lists the 3 items from the order record
Scenario: "atta ke brands"
  Then the bot lists brands from the catalog and no stock figure
Scenario: "kitna stock hai"
  Then the bot replies only "Stock ki jaankari main nahi de sakta."
Scenario: "delivery charge kitna hai?"
  Then the KB bot answers from kuiklo.com text in Hinglish
Scenario: "what is the capital of France"
  Then the KB bot says the question is not about Kuiklo and calls no model
```

### E7. Founder voice (P7)
```gherkin
Scenario: /start
  Then the greeting from Config is sent as a voice note with the AI label in the caption
Scenario: follow-up question
  Then the Devanagari question is voiced and the summary is text only
Scenario: every voice line
  Then it contains Devanagari and no Latin letters
Scenario: voice fails
  Then the same text and buttons go out as a text message
```

### E8. Order page (P8), not built
```gherkin
Scenario: public page
  Given a confirmed order
  Then a page with items, total and delivery promise exists at a random slug with noindex
  And it shows no name, phone or area
```

### E9. WhatsApp (next)
```gherkin
Scenario: same brain, new trigger
  Given a WhatsApp Business API trigger
  When a customer sends a voice note
  Then the same Order brain produces the same messages
```

### E10. Real catalog (next)
```gherkin
Scenario: Kuiklo SKU list
  Given a real catalog export
  When loadCatalog runs
  Then only the allowlisted columns are in memory and no stock column exists
```

### E11. Order writes (next)
```gherkin
Scenario: confirmed order is persisted
  When Confirm is tapped
  Then one row is appended to a sheet or SQLite with the masked phone
  And the row survives a workflow re-import
```
