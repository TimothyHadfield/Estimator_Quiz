# What makes a good Estimator Quiz question

For Claude (and its subagents). The first two sections are Tim's own words and overrule everything below them.

## The game
A player sees a question and types one number. Points fall off with the ratio between the guess and the answer (`1000 * exp(-(ln(guess/answer))^2 / B^2)`), so being within about 10% scores nearly full marks and being 10x off scores almost nothing. Players are Tim's friends and family: ordinary adults in the US, not specialists.

## Tim's criteria (2026-10-10, verbatim)
> fundamentally bad:
> - very niche, so that even context doesn't help the user to have a good estimate
> - well-known, so that many or specific people know the exact number or very close due to commonly stated info. (such as well-known historic dates, population of country, Value of company, etc)
> - questions that have debated or unclear defenitions of wording ("what do you mean by species", "does avg runner include ____?", etc.)
> - Other general knowledge about the world does not help you better estimate the answer much or at all.
> - made to trick the user into highely underestimating or overestimating the number.
>
> needs improveing:
> - questions some user's won't understand ("what is an invertebret",
> - phrasing is uncommon or uses more advanced wording than how a normal person might say.
>
> good questions:
> - factual, without debate
> - clear phrasing and wording
> - provides context if needed ("Botswana, a country in africa, .... ")
> - references people, places, or things that everyone already knows or can understand well with a little context
> - General knowledge about the world helps you estimate the number.
> - Thinking about the answer for longer allows you get closer, but only to an extent (can't solve it through counting or math, or remembering a specific date/number, but having a good understanding of qunatities and general function will improve your guess.
>
> There are more characteristics for each of these but you get the idea.

## Earlier things Tim said (2026-10-09, verbatim)
- "The most important thing with this app are the questions. There are too many questions that are either too similar or there's a word or reference in the question that the average person would have no idea what it's referring to."
- "In general, I think the question should be pretty arbitrary and not designed to surprise or trick the user."
- Questions he named as ones he likes (then added that a couple lean towards "surprise", so copy the style, not the shock): "How many people die from snake bite deaths in India every year?" · "On average, how many new people try Minecraft for the first time every day?" · "How many chickens are consumed every year in the US?" · "Botswana (country in Africa) has the most elephants in the world. How many does it have?"

## Tim's own ratings in the Calibrate screen (2026-10-10)
Good:
- What is the length in feet of human intestines when fully stretched out? (25)
- How many breaths does the average human take per day? (22,000)
- How many Amazon packages are shipped per day on average globally? (20,000,000)
- How many gallons of coffee does Starbucks sell globally per day? (8,000,000)

Alright:
- How many species of bacteria live in the human gut on average? · How many countries are there in the world as recognized by the United Nations? · depth in feet of the Mariana Trench · temperature of a lightning bolt · How many employees did Walmart have worldwide? · average lifespan of a Fortune 500 company · McDonald's revenue in 2024 · Coca-Cola products consumed every second · tweets per day · feet from the pitcher's mound to home plate · miles a marathon runner trains per week · percentage of Earth's freshwater in glaciers

Bad:
- What percentage of animal species on Earth are invertebrates? · What is the age of the universe in billions of years? · How many known dwarf planets are in our solar system? · What year did the French Revolution begin? · Apple's market capitalization at the end of 2024 · Samsung's smartphone market share in Q3 2024 · average CEO compensation at S&P 500 companies in 2023 · percentage of music consumers who use streaming · How many wineries are in Napa Valley?

## Claude's working rules (derived from the above; Tim can overrule any of them)
A question passes only if a thoughtful ordinary adult could say out loud how they would reason towards the number ("there are about 330 million Americans, most eat chicken a few times a week, so…") and that reasoning would land within roughly a factor of 3, while almost nobody simply knows the figure.

Remove (fundamentally bad):
1. **Recall, not estimation.** Dates and years of any kind, ages of famous things, record figures people quote (height of Everest, speed of light, age of the universe, population of the US/world/China, number of US states/UN countries/bones/elements/players on a team, lengths defined by a rulebook, famous company valuations).
2. **Niche.** A person, place, work, term or event an ordinary adult wouldn't recognise, where a short bracket of context still wouldn't let them reason about the size (number of wineries in Napa Valley, works by a minor composer, a specific battle's troop count, Q3 market share of a brand).
3. **Unclear or debated.** The number depends on a definition people argue about or on who is counting (number of species, languages, "types of" something, "average runner"), or sources disagree by more than about 25%.
4. **Nothing to reason from.** Arbitrary figures where knowing a lot about the world doesn't help (a specific building's number of windows, a random company's patent count).
5. **Trick or shock facts.** The point of the question is that the answer is surprisingly big or small.
6. **Small counts and bounded scales.** Answers under about 10, percentages (a 0–100 scale with little room to estimate; Tim rated every percentage he saw "bad"), ratings out of 10, anything where the question nearly gives the range away. Keep a percentage only if it is clearly outstanding by every other test, and keep the word "percentage" in it (the scoring keys off that word).
7. **Solvable by arithmetic.** Seconds in a year, days in a decade, unit conversions.
8. **Fast-aging or unverifiable.** A figure that changes a lot year to year (quarterly market share, follower counts, this year's revenue of a tech firm), or one no reputable source states. Slow-moving figures are fine when the question gives the year or says "about".
9. **Look-alikes.** At most two or three questions of the same template ("population of city X", "height of building Y", "lifespan of animal Z"). Keep the ones about the most recognisable subjects.
10. **Awkward for the scoring.** Answers that are zero or negative.

Reword (needs improving), keeping the meaning and the answer:
- Replace a word an ordinary person wouldn't know, or add a few words of context in brackets right after the name: "Botswana (a country in southern Africa)".
- Say it the way a person would say it. Put the unit in the question ("in miles", "in pounds", "in US dollars"). Say "about" or give the year when the figure moves over time. Say "on average" / "in the US" / "worldwide" when it matters.
- One sentence, or two short ones when the first gives context. No "as officially recognized", "approximately how many", "according to estimates".

Good, in practice:
- Everyday scale questions about things everyone knows: food, the body, animals, homes, cars, travel, weather, cities, sports, shops, money, the planet, space at a simple level, big human projects.
- The answer is a plain positive number with a clear unit, big enough to be a real estimate.
- A reputable source states it (government statistics, an encyclopedia, the organisation itself, a major reference site) and other sources roughly agree.
- A different question from every other one in the set, not the same template with another noun.
