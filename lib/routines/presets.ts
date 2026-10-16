import { parseRoutineText } from './items'

// Sylvia's own routines (2026-10-15), as she wrote them. Offered once as a
// one-tap "Add my routines" in Routines; after that they are ordinary
// routines, edited like any other. The parser that reads this is the same one
// "Paste a routine" uses.
export const MY_ROUTINES_TEXT = `MORNING ROUTINE

**5:30 AM — Wake up**
- Good morning.
- Drink water
- Enjoy a quiet start

**5:40 AM — Quiet time**
- Journal, read, meditate, or simply sit in silence.
- Set an intention for the day.

**6:00 AM — Food + coffee**
- Make breakfast and coffee or tea.
- Add protein powder or collagen to my smoothie or coffee.
- Enjoy my morning drink.
- Start work or creative projects.

**7:00 AM — Walk**
- Get outside and enjoy natural light.
- Listen to a podcast, audiobook, or music.

**7:45 AM — Workout / stimulation**
- Strength training, Pilates, stretching, or another form of movement.
- Do something that energizes my body and mind.

**9:00 AM — Shower + get ready**
- Shower and complete skincare.
- Get dressed and prepare for the day.

---

DON'T WAIT TO…

- Fill the kettle → unload the dishwasher or do oil pulling while it boils.
- Set up tomorrow’s coffee or tea
- Make a smoothie or coffee → add protein powder or collagen if needed.
- Go for a walk or do chores → listen to a podcast.
- Finish using something → put it back where it belongs.
- Notice clutter → put things away immediately.
- Prep lunch or dinner → check ingredients and write down anything that needs restocking.
- Finish the last of something → add it to my shopping list or replace it.
- Have a few spare minutes → take care of one small task.
- Think of something I need to do → write it down before I forget.

**My rule:** If it takes less than a minute and I can do it now, do it now.

---

## NIGHT ROUTINE

**After dinner — Reset the kitchen**
- Clear the table.
- Wash dishes or load the dishwasher.
- Wipe down counters.
- Put leftovers and ingredients away.

**Evening — Prepare tomorrow's food**
- Prep lunch and plan dinner.
- Portion ingredients or prepare anything I can in advance.
- Write down groceries and household essentials that need restocking.

**Evening — Reset the home**
- Put everything back where it belongs.
- Clear surfaces and tidy shared spaces.
- Replace anything I’ve finished using.

**Before bed — Prepare for tomorrow**
- Set up coffee or tea and my favorite mug.
- Set out anything I’ll need in the morning.

**Wind down**
- Shower or complete skincare if I haven't already.
- Stretch, read, or listen to something relaxing.
- Dim the lights and put my phone away.
- Think of one thing I’m grateful for.

**Bedtime**
- Aim for 10-11pm
- Remind myself that tomorrow is a fresh start.
`

export const MY_ROUTINES = parseRoutineText(MY_ROUTINES_TEXT)
