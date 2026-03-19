/* ============================================================
   SCRIPTSENSE — DATA.JS
   All hardcoded syllabus content, past exam questions,
   marking keys, performance descriptors, and exemplars.
   Source: SCSA WACE ATAR | Bob Hawke College English Dept.
   ============================================================ */


/* ============================================================
   LITERATURE ATAR — PAST EXAM QUESTIONS (2023–2025)
   ============================================================ */

const LITERATURE_PAST_QUESTIONS = [

  // ── 2025 ──────────────────────────────────────────────────
  {
    year: 2025,
    question_number: 1,
    task_type: "close_reading",
    text: "Present a close reading of one of the three texts. Indicate by shading the circle for the text you have chosen.",
    concepts_targeted: ["close reading", "language", "stylistic choices", "form"]
  },
  {
    year: 2025,
    question_number: 2,
    task_type: "analytical",
    text: "Evaluate how the use of generic conventions within at least one poem can be considered aesthetic and/or ideological.",
    concepts_targeted: ["generic conventions", "aesthetic function", "ideological function", "poetry", "form"]
  },
  {
    year: 2025,
    question_number: 3,
    task_type: "analytical",
    text: "Consider the ways structural choices contribute to the creative representation of familiar ideas in a prose fiction text.",
    concepts_targeted: ["structural choices", "prose fiction", "representation", "familiar ideas", "form"]
  },
  {
    year: 2025,
    question_number: 4,
    task_type: "analytical",
    text: "Analyse how language, including visual and sound elements, within a drama text represents people or events associated with a particular context.",
    concepts_targeted: ["language", "visual elements", "sound elements", "drama", "context", "representation"]
  },
  {
    year: 2025,
    question_number: 5,
    task_type: "analytical",
    text: "Discuss how the representation of power within at least one literary text serves the interests of certain groups or individuals.",
    concepts_targeted: ["power", "ideology", "representation", "marginalisation", "dominant groups"]
  },
  {
    year: 2025,
    question_number: 6,
    task_type: "analytical",
    text: "Explain how your application of different reading strategies leads to complementary interpretations of a literary text.",
    concepts_targeted: ["reading strategies", "multiple readings", "interpretation", "reader positioning"]
  },
  {
    year: 2025,
    question_number: 7,
    task_type: "analytical",
    text: "Consider how the construction of conflict within at least one literary text enabled you to draw parallels with your own cultural experiences.",
    concepts_targeted: ["cultural experience", "reader context", "conflict", "representation", "ideology"]
  },
  {
    year: 2025,
    question_number: 8,
    task_type: "analytical",
    text: "Reflect on the reasons why interpretations of a literary text may persist or change over the course of time.",
    concepts_targeted: ["interpretations over time", "context", "reader context", "cultural assumptions", "discourse"]
  },
  {
    year: 2025,
    question_number: 9,
    task_type: "analytical",
    text: "Discuss the way representations of culture in at least one literary text can function to reshape values, attitudes and/or beliefs.",
    concepts_targeted: ["culture", "ideology", "values", "attitudes", "beliefs", "representation", "reshape"]
  },

  // ── 2024 ──────────────────────────────────────────────────
  {
    year: 2024,
    question_number: 1,
    task_type: "close_reading",
    text: "Present a close reading of one of the three texts. Indicate by shading the circle for the text you have chosen.",
    concepts_targeted: ["close reading", "language", "form", "stylistic choices"]
  },
  {
    year: 2024,
    question_number: 2,
    task_type: "analytical",
    text: "Discuss the way an adherence to a specific form or tradition has been integral in communicating meaning in at least one drama text you have studied.",
    concepts_targeted: ["form", "tradition", "drama", "conventions", "meaning"]
  },
  {
    year: 2024,
    question_number: 3,
    task_type: "analytical",
    text: "Discuss the way the powerful or privileged have been represented through the construction of at least one poem you have studied.",
    concepts_targeted: ["power", "privilege", "representation", "poetry", "ideology", "dominant groups"]
  },
  {
    year: 2024,
    question_number: 4,
    task_type: "analytical",
    text: "With reference to at least one prose fiction text you have studied, discuss the way the application of different reading strategies has allowed you to interpret a character or event in the text in at least two differing ways.",
    concepts_targeted: ["reading strategies", "multiple readings", "prose fiction", "character", "interpretation"]
  },
  {
    year: 2024,
    question_number: 5,
    task_type: "analytical",
    text: "Discuss the way at least one literary text you have studied has been constructed to present a view of a nation's past that is difficult to ignore.",
    concepts_targeted: ["national identity", "cultural memory", "past", "representation", "construction"]
  },
  {
    year: 2024,
    question_number: 6,
    task_type: "analytical",
    text: "Explore how the perspectives within at least one literary text you have studied may be reviewed by a contemporary Australian audience.",
    concepts_targeted: ["contemporary Australian audience", "reader context", "perspective", "ideology", "cultural assumptions"]
  },
  {
    year: 2024,
    question_number: 7,
    task_type: "analytical",
    text: "Consider how at least one literary text you have studied has positioned readers by inviting them to draw on connections made to other texts.",
    concepts_targeted: ["intertextuality", "reader positioning", "connections", "meaning"]
  },
  {
    year: 2024,
    question_number: 8,
    task_type: "analytical",
    text: "Discuss the ways the discourse(s) used in at least one literary text you have studied has conveyed a particular representation of the world.",
    concepts_targeted: ["discourse", "representation", "ideology", "language", "values"]
  },
  {
    year: 2024,
    question_number: 9,
    task_type: "analytical",
    text: "Explore the ways a reader's cultural assumptions about people or place can influence their response to a studied text.",
    concepts_targeted: ["reader context", "cultural assumptions", "gender", "social position", "response"]
  },

  // ── 2023 ──────────────────────────────────────────────────
  {
    year: 2023,
    question_number: 1,
    task_type: "close_reading",
    text: "Present a close reading of one of the three texts. Indicate by shading the circle for the text you have chosen.",
    concepts_targeted: ["close reading", "language", "form"]
  },
  {
    year: 2023,
    question_number: 2,
    task_type: "analytical",
    text: "Discuss the ways that a text you have studied has presented a multilayered representation of Australian values and attitudes.",
    concepts_targeted: ["Australian identity", "values", "attitudes", "representation", "multilayered"]
  },
  {
    year: 2023,
    question_number: 3,
    task_type: "analytical",
    text: "Reflect on the way that a text you have studied has represented your social group, gender or culture in ways that surprised or concerned you.",
    concepts_targeted: ["social group", "gender", "culture", "representation", "reader context", "ideology"]
  },
  {
    year: 2023,
    question_number: 4,
    task_type: "analytical",
    text: "Explore the ways that at least one text you have studied can be seen as a 'call to action' for readers to address particular social concerns.",
    concepts_targeted: ["reader positioning", "ideology", "social concerns", "values", "representation"]
  },
  {
    year: 2023,
    question_number: 5,
    task_type: "analytical",
    text: "Discuss how the aesthetic qualities of at least one text you have studied have served an ideological function.",
    concepts_targeted: ["aesthetic function", "ideological function", "literary conventions", "form", "language"]
  },
  {
    year: 2023,
    question_number: 6,
    task_type: "analytical",
    text: "Explore how at least one literary text's form or medium has been integral to communicating its meaning to readers.",
    concepts_targeted: ["form", "medium", "meaning", "conventions", "genre"]
  },
  {
    year: 2023,
    question_number: 7,
    task_type: "analytical",
    text: "Examine how changing ways of thinking about the world are reflected in the manipulation of language in at least one text you have studied.",
    concepts_targeted: ["discourse", "language", "ideology", "changing interpretations", "manipulation"]
  },
  {
    year: 2023,
    question_number: 8,
    task_type: "analytical",
    text: "Discuss the way that at least one literary text has relied upon readers' intertextual knowledge so that its representations can be critiqued and/or understood.",
    concepts_targeted: ["intertextuality", "reader knowledge", "representation", "critique"]
  },
  {
    year: 2023,
    question_number: 9,
    task_type: "analytical",
    text: "Discuss the way that a prose fiction text you have studied has borrowed or blended conventions from other genres for a particular purpose or purposes.",
    concepts_targeted: ["genre blending", "conventions", "prose fiction", "purpose", "form"]
  },
  {
    year: 2023,
    question_number: 10,
    task_type: "analytical",
    text: "Discuss the ways that at least one poem's language features have been crafted to maximise emotional impact.",
    concepts_targeted: ["poetry", "language features", "emotional impact", "stylistic choices"]
  },
  {
    year: 2023,
    question_number: 11,
    task_type: "analytical",
    text: "Explain how the use of monologue and/or soliloquy and/or aside in at least one drama text has fundamentally shaped your perception of a character or characters.",
    concepts_targeted: ["drama", "monologue", "soliloquy", "aside", "character", "conventions"]
  }

];


/* ============================================================
   LITERATURE ATAR — SYLLABUS CONCEPTS
   Source: SCSA WACE Literature ATAR Year 12 Syllabus
   ============================================================ */

const LITERATURE_SYLLABUS_CONCEPTS = [

  {
    concept: "Ideology",
    definition: "The system of attitudes, values, beliefs and assumptions held by powerful groups. Literary texts may 'naturalise' particular ways of thinking, serving the purposes of dominant groups while marginalising the views of less powerful groups.",
    application: "Students should analyse how texts reinforce or challenge ideological positions, and identify whose values are privileged or suppressed.",
    related_terms: ["dominant ideology", "hegemony", "marginalisation", "naturalising", "power"]
  },
  {
    concept: "Discourse",
    definition: "Different groups of people use different terms to represent their ideas about the world. These different discourses — ways of thinking and speaking — offer particular representations of the world.",
    application: "Students should identify whose discourse shapes the text and how this positions readers towards certain values and attitudes.",
    related_terms: ["language", "representation", "power", "positioning", "narrative voice"]
  },
  {
    concept: "Intertextuality",
    definition: "The way texts refer to, borrow from, or are in dialogue with other texts. Reading intertextually helps readers understand and critique representations.",
    application: "Students should identify allusions, references, borrowings and how these create or subvert meaning.",
    related_terms: ["allusion", "borrowing", "blending", "dialogue between texts", "genre"]
  },
  {
    concept: "Reading Strategies",
    definition: "Different approaches to reading that produce different interpretations. Multiple readings of a text are possible. Strategies include resistant readings, symptomatic readings, and dominant readings.",
    application: "Students should apply at least two reading strategies to produce complementary or competing interpretations.",
    related_terms: ["resistant reading", "dominant reading", "symptomatic reading", "non-dominant reading", "interpretation"]
  },
  {
    concept: "Reader Context and Cultural Assumptions",
    definition: "The influence of the reader's context, cultural assumptions, social position and gender on how they respond to and interpret a text.",
    application: "Students should consider how their own position as readers shapes interpretation, including how a contemporary Australian audience might review historical texts.",
    related_terms: ["reader positioning", "social position", "gender", "cultural context", "Australian audience"]
  },
  {
    concept: "Representation",
    definition: "The way language constructs people, events, places and ideas in particular ways. Representations are never neutral — they reflect the ideology of the author, genre and culture.",
    application: "Students should analyse specific language, structural and stylistic choices and explain the values and attitudes they communicate.",
    related_terms: ["construction", "ideology", "values", "language", "framing"]
  },
  {
    concept: "Generic Conventions and Form",
    definition: "The rules, expectations and features associated with particular genres. Genres have social, ideological and aesthetic functions. Writers may blend and borrow conventions for particular effects.",
    application: "Students should identify how adherence to or subversion of conventions creates meaning and positions readers.",
    related_terms: ["genre", "form", "conventions", "subversion", "blending", "aesthetic function"]
  },
  {
    concept: "Aesthetic and Ideological Functions",
    definition: "Literary techniques can serve both aesthetic purposes (creating beauty, pleasure, artistic effect) and ideological purposes (reinforcing or challenging values and beliefs). These functions often operate simultaneously.",
    application: "Students should analyse how stylistic and literary choices serve both aesthetic and ideological ends, and explain why they cannot always be separated.",
    related_terms: ["literary techniques", "aesthetic effect", "ideology", "form", "language"]
  },
  {
    concept: "Cultural Change and Difference",
    definition: "How literature represents and/or reflects cultural change and difference, including how interpretations of texts vary over time and across cultures.",
    application: "Students should consider how the historical and cultural contexts in which texts were produced and received shape their meaning.",
    related_terms: ["cultural context", "historical context", "reception", "changing interpretations", "discourse"]
  },
  {
    concept: "National and Cultural Identity",
    definition: "The ways in which representations of the past allow a nation or culture to recognise itself, including how authors represent Australian culture, place and identity.",
    application: "Students should analyse how texts construct versions of national or cultural identity, and for whose benefit.",
    related_terms: ["Australian identity", "place", "cultural memory", "national narrative", "representation"]
  },
  {
    concept: "Power and Marginalisation",
    definition: "The way powerful or dominant groups use discourse, narrative and representation to maintain their position while silencing or marginalising less powerful groups.",
    application: "Students should identify which groups are centred or marginalised in a text and analyse the linguistic and structural strategies used to achieve this.",
    related_terms: ["ideology", "dominant discourse", "silencing", "privilege", "othering"]
  },
  {
    concept: "Language as a Cultural Medium",
    definition: "The power of language to represent ideas, events and people in particular ways. Language is a cultural medium and its meanings vary according to context.",
    application: "Students should analyse specific word choices, syntactic structures, figurative language and their ideological implications.",
    related_terms: ["word choice", "diction", "syntax", "figurative language", "connotation", "context"]
  },
  {
    concept: "Structural Choices",
    definition: "How the arrangement, ordering and organisation of a text creates meaning, positions readers, and communicates values and attitudes.",
    application: "Students should analyse narrative structure, sequencing, focalization, perspective and how these shape interpretation.",
    related_terms: ["narrative structure", "sequencing", "focalization", "perspective", "form"]
  },
  {
    concept: "Close Reading",
    definition: "Detailed, sustained attention to the specific language, structure and style of a text to uncover layers of meaning and ideological content.",
    application: "Students should demonstrate knowledge of specific textual features and explain precisely how they create meaning.",
    related_terms: ["textual analysis", "language", "style", "close attention", "evidence"]
  },
  {
    concept: "Non-Dominant Readings",
    definition: "Interpretations that resist or challenge the preferred reading of a text, often by reading against the grain or foregrounding the perspectives of marginalised groups.",
    application: "Students should construct readings that challenge the dominant ideology of a text, using evidence from the text itself.",
    related_terms: ["resistant reading", "reading against the grain", "marginalisation", "ideology", "alternative interpretation"]
  },
  {
    concept: "Context of Production and Reception",
    definition: "The social, cultural, historical and political circumstances in which a text was produced, and the different contexts in which it has been and continues to be received.",
    application: "Students should discuss how context shapes both the creation of the text and how readers in different times and places respond to it.",
    related_terms: ["historical context", "social context", "authorial context", "reception", "changing interpretations"]
  },
  {
    concept: "Magical Realism",
    definition: "A narrative mode in which magical or supernatural elements are presented as normal within an otherwise realistic setting, often used to critique political and social realities, particularly in postcolonial literature.",
    application: "Students should analyse how magical realist techniques blur the distinction between the real and the fantastic to serve ideological and aesthetic functions.",
    related_terms: ["García Márquez", "postcolonial", "Latin American literature", "surreal", "political critique"]
  },
  {
    concept: "Postcolonial Reading",
    definition: "A reading strategy that examines how texts produce, reproduce or challenge colonial ideologies, including representations of empire, race, cultural hierarchy and resistance.",
    application: "Students should identify colonial or imperial ideologies in texts and analyse how they are reinforced or subverted.",
    related_terms: ["imperialism", "colonialism", "ideology", "marginalisation", "power", "centre/periphery"]
  },
  {
    concept: "Feminist Reading",
    definition: "A reading strategy that examines how texts represent gender, particularly the construction of femininity and masculinity, and how patriarchal ideologies are reinforced or challenged.",
    application: "Students should identify how gender is constructed in a text and whose interests those constructions serve.",
    related_terms: ["gender", "patriarchy", "representation", "ideology", "women", "power"]
  },
  {
    concept: "Marxist Reading",
    definition: "A reading strategy that examines how texts reflect or challenge class structures, economic inequality and the ideologies used by dominant classes to maintain power.",
    application: "Students should identify how class, labour and capital are represented in a text and how the text naturalises or critiques these structures.",
    related_terms: ["class", "capitalism", "ideology", "labour", "power", "economic structures"]
  }

];


/* ============================================================
   LITERATURE ATAR — MARKING KEY (Bob Hawke College)
   Source: Bob Hawke College English Department rubric
   Total per response: /30 (exam total /60 across two responses)
   ============================================================ */

const LITERATURE_MARKING_KEY = {

  total_per_response: 30,
  exam_total: 60,
  note: "Each criterion is marked /6. There are 5 criteria per response. The exam total of 60 reflects two responses each worth 30 marks.",

  criteria: [
    {
      name: "Engagement with the question",
      max_marks: 6,
      descriptors: [
        { marks: 6, label: "Sophisticated", description: "A sophisticated and sustained engagement with all parts of the question" },
        { marks: 5, label: "Comprehensive", description: "A comprehensive engagement with all parts of the question" },
        { marks: 4, label: "Thorough", description: "A thorough engagement with all parts of the question" },
        { marks: 3, label: "General", description: "A general engagement with most parts of the question" },
        { marks: 2, label: "Limited", description: "A limited or simplistic engagement with the question" },
        { marks: 1, label: "Minimal", description: "Little or no engagement with the question" },
        { marks: 0, label: "No evidence", description: "No evidence of this criterion" }
      ]
    },
    {
      name: "Course concepts",
      max_marks: 6,
      descriptors: [
        { marks: 6, label: "Sophisticated", description: "A sophisticated understanding and application of the course concepts that are related to the question" },
        { marks: 5, label: "Well-informed", description: "A well-informed understanding and application of the course concepts that are related to the question" },
        { marks: 4, label: "Sound", description: "A sound understanding and application of the course concepts that are related to the question" },
        { marks: 3, label: "General", description: "A general understanding and some application of the course concepts that are related to the question" },
        { marks: 2, label: "Vague", description: "A vague understanding of the course concepts that are related to the question" },
        { marks: 1, label: "Little", description: "Little or no understanding of the course concepts that are related to the question" },
        { marks: 0, label: "No evidence", description: "No evidence of this criterion" }
      ]
    },
    {
      name: "Use of evidence",
      max_marks: 6,
      descriptors: [
        { marks: 6, label: "Detailed", description: "Detailed textual analysis of text examples, language and/or generic conventions and reference to cultural contexts where appropriate throughout the response to develop and support the answer" },
        { marks: 5, label: "Textual analysis", description: "Textual analysis of text examples, language and/or generic conventions and reference to cultural contexts where appropriate throughout the response to develop and support the answer" },
        { marks: 4, label: "Textual analysis with some cultural reference", description: "Textual analysis of test examples, language and/or generic conventions with some reference to cultural contexts where appropriate to largely develop the answer" },
        { marks: 3, label: "Some textual analysis", description: "Some textual analysis of relevant examples from the text that generally develop the answer" },
        { marks: 2, label: "Some use", description: "Some use of relevant examples in the answer" },
        { marks: 1, label: "Limited", description: "Limited evidence to support an answer" },
        { marks: 0, label: "No evidence", description: "No evidence of this criterion" }
      ]
    },
    {
      name: "Linguistic, stylistic and critical terminology",
      max_marks: 6,
      descriptors: [
        { marks: 6, label: "Sophisticated and comprehensive", description: "A sophisticated and comprehensive use of linguistic, stylistic and critical terminology suited to the answer" },
        { marks: 5, label: "Comprehensive", description: "A comprehensive use of linguistic, stylistic and critical terminology appropriate to the answer" },
        { marks: 4, label: "Consistent", description: "A consistent use of linguistic, stylistic and critical terminology mostly related to the answer" },
        { marks: 3, label: "Some use", description: "Some use of linguistic, stylistic and critical terminology mostly related to the answer" },
        { marks: 2, label: "Infrequent", description: "Infrequent use of linguistic, stylistic and critical terminology not always appropriate to the answer" },
        { marks: 1, label: "Limited and inaccurate", description: "Limited and inaccurate use of linguistic, stylistic and critical terminology" },
        { marks: 0, label: "No evidence", description: "No evidence of this criterion" }
      ]
    },
    {
      name: "Expression of ideas",
      max_marks: 6,
      descriptors: [
        { marks: 6, label: "Sophisticated", description: "In sophisticated language, style and structure" },
        { marks: 5, label: "Controlled", description: "In controlled language, style and structure" },
        { marks: 4, label: "Mostly controlled", description: "In mostly controlled language, style and structure" },
        { marks: 3, label: "Generally clear", description: "In a generally clear way with deficiencies in language, style and structure which do not inhibit overall communication" },
        { marks: 2, label: "Disjointed", description: "In a disjointed style, characterised by unclear language use and lack of structure" },
        { marks: 1, label: "Difficult to follow", description: "That are difficult to follow because of unclear language use and lack of structure" },
        { marks: 0, label: "No evidence", description: "No evidence of this criterion" }
      ]
    }
  ]

};


/* ============================================================
   LITERATURE ATAR — EXEMPLARS
   Sources: Critical Insights essay (De Castro) and student
   response (implied by data.js context)
   ============================================================ */

const LITERATURE_EXEMPLARS = [

  {
    id: "lit_exemplar_1",
    type: "critical_essay",
    title: "Cultural Contact, Modernization, and Imperialism in One Hundred Years of Solitude",
    author: "Juan E. De Castro",
    text_studied: "One Hundred Years of Solitude",
    author_text: "Gabriel García Márquez",
    grade_level: "high_band",
    notes: "Academic critical essay. Demonstrates sophisticated application of postcolonial reading strategy, centre/periphery discourse, and ideology. Useful model for Task 3 analytical responses.",
    key_techniques_demonstrated: [
      "Sustained argument across multiple body paragraphs",
      "Integration of specific textual evidence with analysis",
      "Application of postcolonial critical framework throughout",
      "Discussion of Marxist and feminist readings",
      "Nuanced, non-dominant interpretation (Amaranta Úrsula as exception to periphery model)",
      "Sophisticated use of critical terminology: discourse, ideology, cultural capital, centre/periphery, uneven development",
      "Contextual grounding — banana company as United Fruit Company",
      "Conclusion that complicates rather than resolves the argument"
    ],
    relevant_question_types: ["ideology", "representation", "reading strategies", "culture", "power", "non-dominant readings"],
    excerpt_for_model_paragraph: "One Hundred Years of Solitude clearly delineates the cultural subordination of the periphery to the center and the underlying international economic hierarchy, which, in principle, is manifested in the monotonous and slavish repetition of whatever novelty originates in the center. Moreover, the presence of the US-based banana company serves to represent, with imagination and verve, the practices and abuses characteristic of imperial capital in Latin America."
  },

  {
    id: "lit_exemplar_2",
    type: "student_analytical",
    title: "Dystopian Uniformity and the Destruction of the Individual",
    author: "Student sample (high band)",
    text_studied: "Nineteen Eighty-Four / We (comparative)",
    author_text: "George Orwell / Yevgeny Zamyatin",
    grade_level: "high_band",
    notes: "High-band student response demonstrating sophisticated comparative analysis, sustained ideological reading, embedded quotation, and complex argument structure.",
    key_techniques_demonstrated: [
      "Opening with high-impact textual quotation that anchors the argument",
      "Clear thesis established early with precise course concept terminology",
      "Comparative structure that links both texts meaningfully across each paragraph",
      "Ideological reading maintained throughout — Ingsoc, One State as systems of control",
      "Multiple reading strategies implied: Marxist, psychological, historical",
      "Precise embedded quotation with page references",
      "Synthesis with contemporary context (fake news, social media surveillance)",
      "Nuanced conclusion that avoids oversimplification"
    ],
    relevant_question_types: ["ideology", "power", "reading strategies", "representation", "discourse", "course concepts"],
    high_band_features: [
      "Opens with a quotation that embeds course concept (power, collective vs individual) immediately",
      "Uses Marxist/political critical lens without naming it simplistically",
      "Non-dominant reading: argues that hope persists through individual resistance despite institutional failure",
      "Complex syntax sustains sophisticated argument — not simplistic topic sentences",
      "Connects 1930s-40s textual contexts to 2017 contemporary relevance with specificity (QUT study)"
    ]
  }

];


/* ============================================================
   ENGLISH ATAR — PAST EXAM QUESTIONS (2023–2025)
   ============================================================ */

const ENGLISH_PAST_QUESTIONS = {

  responding: [

    // ── 2025 ──────────────────────────────────────────────────
    { year: 2025, q: 1, text: "Analyse how the relationship depicted in Text 1 has been constructed using language features.", skills: ["language features", "construction", "relationship", "close analysis"] },
    { year: 2025, q: 2, text: "Compare how stylistic choices have been used to represent magpies in Text 1 and Text 2.", skills: ["stylistic choices", "comparison", "representation", "language"] },
    { year: 2025, q: 3, text: "Analyse how the themes or ideas in a text are enhanced by the use of language patterns.", skills: ["language patterns", "theme", "ideas", "analysis"] },
    { year: 2025, q: 4, text: "Explain why your interpretation of a text might differ from that of another audience.", skills: ["audience", "interpretation", "context", "reader positioning"] },
    { year: 2025, q: 5, text: "Examine how the construction of a text offers insights into the particular context in which it was created or received.", skills: ["context", "construction", "reception", "insights"] },
    { year: 2025, q: 6, text: "Compare how generic conventions have been manipulated in two texts to fulfil specific purposes.", skills: ["generic conventions", "manipulation", "purpose", "comparison"] },
    { year: 2025, q: 7, text: "Discuss how your response to a text was shaped by what its creator chose to include, emphasise or omit.", skills: ["selection", "omission", "emphasis", "perspective", "reader response"] },
    { year: 2025, q: 8, text: "Evaluate the impact of mode in conveying the perspective(s) in at least one text.", skills: ["mode", "perspective", "impact", "evaluation"] },

    // ── 2024 ──────────────────────────────────────────────────
    { year: 2024, q: 1, text: "Explain how your interpretation of Text 1 is shaped by its use of written and visual language features.", skills: ["written language", "visual language", "interpretation", "language features"] },
    { year: 2024, q: 2, text: "Analyse how the voice of Marcellus is constructed in Text 2 to convey a perspective on captivity.", skills: ["voice", "construction", "perspective", "captivity", "narrative point of view"] },
    { year: 2024, q: 3, text: "Account for the ways your interpretation of a text is affected by your understanding of context.", skills: ["context", "interpretation", "reader positioning", "cultural context"] },
    { year: 2024, q: 4, text: "Discuss how and why your expectations of a genre have been met or not met in at least one text.", skills: ["genre", "conventions", "expectations", "audience response"] },
    { year: 2024, q: 5, text: "Explain how one text offers an empathetic perspective through its selection of language features.", skills: ["empathy", "perspective", "language features", "selection"] },
    { year: 2024, q: 6, text: "Analyse how language choices contribute to a text's representation of values or attitudes.", skills: ["language choices", "values", "attitudes", "representation"] },
    { year: 2024, q: 7, text: "Explain the ways two texts use or manipulate generic conventions to generate a response from an audience.", skills: ["generic conventions", "manipulation", "audience response", "comparison"] },
    { year: 2024, q: 8, text: "Compare how two texts of the same genre represent ideas in similar or different ways.", skills: ["comparison", "genre", "representation", "ideas"] },

    // ── 2023 ──────────────────────────────────────────────────
    { year: 2023, q: 1, text: "Analyse how Text 1 uses features of its genre to promote the film.", skills: ["genre", "features", "purpose", "promotion"] },
    { year: 2023, q: 2, text: "Explain three ways the character Ned is constructed in Text 2.", skills: ["character construction", "language", "representation"] },
    { year: 2023, q: 3, text: "Compare the openings of two texts of the same genre by analysing their language or stylistic choices.", skills: ["comparison", "genre", "stylistic choices", "openings"] },
    { year: 2023, q: 4, text: "Show how your knowledge of a text's context shaped your understanding of a perspective it communicated.", skills: ["context", "perspective", "understanding", "shaping"] },
    { year: 2023, q: 5, text: "Explore the effects on your interpretation when a text was transformed into another genre or medium.", skills: ["transformation", "genre", "medium", "interpretation", "mode"] },
    { year: 2023, q: 6, text: "Discuss how a text engages with issues or ideas significant within its context.", skills: ["context", "issues", "ideas", "engagement"] },
    { year: 2023, q: 7, text: "Critically appraise how the conventions used in one text influence audience responses.", skills: ["conventions", "audience response", "influence", "appraisal"] },
    { year: 2023, q: 8, text: "Analyse how the use of voice or narrative point of view affected the representation of attitudes in one text.", skills: ["voice", "narrative point of view", "attitudes", "representation"] }

  ],

  composing: [

    // ── 2025 ──────────────────────────────────────────────────
    { year: 2025, q: 9, type: "imaginative", text: "Compose a text in a genre of your choice, making effective use of symbolism inspired by this image.", skills: ["symbolism", "genre", "imaginative", "image-based"] },
    { year: 2025, q: 10, type: "persuasive", text: "Craft a persuasive text that promotes the value of preserving a local landmark or tradition to a youth audience.", skills: ["persuasion", "audience", "purpose", "language features"] },
    { year: 2025, q: 11, type: "imaginative", text: "Compose an imaginative text in which landscape is integral to the development of theme or character.", skills: ["landscape", "theme", "character", "imaginative", "genre"] },
    { year: 2025, q: 12, type: "interpretive", text: "'The beauty of sharing your passion is seeing the spark of wonder ignite in others' eyes.' Drawing on this quote, create an interpretive text that introduces a pastime or hobby.", skills: ["interpretive", "quote-based", "voice", "style"] },
    { year: 2025, q: 13, type: "imaginative", text: "In a form of your choice, compose a text that includes the situation captured in the image below.", skills: ["image-based", "genre", "form", "imaginative"] },

    // ── 2024 ──────────────────────────────────────────────────
    { year: 2024, q: 9, type: "interpretive", text: "In a form of your choice, craft a conversation between two young adults where one is encouraging the other to appreciate the importance of showing empathy.", skills: ["dialogue", "empathy", "voice", "form"] },
    { year: 2024, q: 10, type: "persuasive", text: "Compose a text in a genre of your choice that endorses a perspective on the natural world.", skills: ["persuasion", "nature", "perspective", "genre"] },
    { year: 2024, q: 11, type: "interpretive", text: "Write an interpretive text that evaluates the best things you have watched, read, heard, and/or played this year.", skills: ["interpretive", "voice", "personal", "evaluation"] },
    { year: 2024, q: 12, type: "persuasive", text: "Develop an argument to persuade an adult Australian audience that volunteering needs the involvement of young people in order to survive.", skills: ["argument", "persuasion", "audience", "purpose"] },
    { year: 2024, q: 13, type: "imaginative", text: "Drawing inspiration from the image below, craft an imaginative text that starts and ends in the same place, but in a different time.", skills: ["time", "structure", "image-based", "imaginative"] },

    // ── 2023 ──────────────────────────────────────────────────
    { year: 2023, q: 9, type: "interpretive", text: "Craft an interpretive text for a specific audience with the title 'What Makes Me Happy Now'.", skills: ["interpretive", "audience", "title-based", "voice"] },
    { year: 2023, q: 10, type: "persuasive", text: "Compose a persuasive text that sustains a viewpoint suggested by the image below.", skills: ["persuasion", "image-based", "viewpoint", "sustained argument"] },
    { year: 2023, q: 11, type: "imaginative", text: "Compose a text in a genre of your choice in which something once lost is found.", skills: ["theme", "genre", "imaginative", "structure"] },
    { year: 2023, q: 12, type: "imaginative", text: "Compose an imaginative text that adapts a traditional tale for a contemporary Australian context.", skills: ["adaptation", "intertextuality", "Australian context", "genre"] },
    { year: 2023, q: 13, type: "mixed", text: "Craft the opening of one imaginative text and the opening of one persuasive text using a similar idea generated from the stimulus below.", skills: ["genre", "openings", "contrast", "stimulus"] }

  ],

  comprehending: [
    {
      id: "comp_stimulus_1",
      type: "written",
      title: "Technology Conference Speech — Rare Earth Mining",
      genre: "persuasive speech",
      content: `Hello my name is Elizabeth Shaw, thank you for giving me the opportunity to speak here at the 'Future of Technology Conference 2017'. There is great hope in front of me here; there is great excitement in the room for the future of our industry. But it must be an industry of which we are proud; one that is sustainable; an industry that exercises corporate, social and moral responsibility.

Today, I am here to expose the ethically abhorrent practices of rare earth mining in the Democratic Republic of Congo and in Northern China before I call on everyone in this room to take action against the abuses within our industry.

The treatment of rare earth miners in the Congo is immoral, it is unjust and it cannot go on. In the DRC rare earth miners work 12 hours a day with their bare hands in search of the tantalum, cobalt and tungsten for our iPhones. Their payment for a gruelling day's work: $5, a sharp contrast to the $500, $800 or $1000 you and I paid for our precious "space grey" smartphones. They have no safety equipment. They haul the minerals on their backs, all under the eyes of the foreman constantly urging them to work harder, faster, longer, often using violence to do so.

But then there is the issue that lies beneath the surface: the hidden child labour. A mine where children as young as 10 slave away in brutal conditions day in and day out. Approximately 40,000 children — according to UNICEF — are working in unregulated, unsafe mines to support an industry that ransacks resource-rich land.`,
      questions: [
        "Analyse how the speaker constructs a persuasive argument in this text.",
        "Explain how language features such as statistics and rhetorical questions are used to position the audience.",
        "Discuss how the speaker's use of contrast contributes to the representation of the issue."
      ],
      syllabus_links: ["language features", "persuasion", "audience positioning", "representation", "values and attitudes"]
    }
  ]

};


/* ============================================================
   ENGLISH ATAR — SYLLABUS CONCEPTS
   Source: SCSA WACE English ATAR Year 12 Units 3 & 4
   ============================================================ */

const ENGLISH_SYLLABUS_CONCEPTS = {

  shared: [
    {
      concept: "Language Features and Techniques",
      definition: "The specific choices of language — including vocabulary, syntax, tone, figurative language, and structural devices — that a composer uses to create meaning and achieve purposes.",
      skills: ["identifying techniques", "explaining effects", "linking to purpose and audience"],
      examples: ["metaphor", "irony", "repetition", "alliteration", "sentence structure", "rhetorical questions", "statistics", "anecdote"]
    },
    {
      concept: "Generic Conventions",
      definition: "The recognisable features and expectations associated with particular genres (e.g. feature articles, speeches, short stories, poetry). These may be met, subverted or manipulated for effect.",
      skills: ["identifying conventions", "explaining how they meet or subvert expectations", "linking to audience response"]
    },
    {
      concept: "Context",
      definition: "The circumstances in which a text is produced and received, including historical, social, cultural and political factors. Context shapes both composition and interpretation.",
      skills: ["identifying relevant context", "explaining how context shapes meaning", "considering context of production vs reception"]
    },
    {
      concept: "Voice and Narrative Point of View",
      definition: "The persona or perspective from which a text is narrated or delivered. Voice includes tone, register, and the relationship constructed between speaker/writer and audience.",
      skills: ["identifying voice", "analysing construction of voice", "explaining effect on audience"]
    },
    {
      concept: "Values and Attitudes",
      definition: "The beliefs, priorities and judgements that are embedded in texts, either explicitly or implicitly, through language choices, structure and representation.",
      skills: ["identifying values", "analysing how language embeds values", "evaluating perspectives"]
    },
    {
      concept: "Audience and Purpose",
      definition: "The intended reader or viewer of a text, and the goal the text is designed to achieve. Language and structural choices are made in response to audience and purpose.",
      skills: ["identifying audience", "explaining purpose", "linking choices to audience/purpose"]
    },
    {
      concept: "Mode and Medium",
      definition: "The form or channel through which a text is delivered (written, spoken, visual, multimodal). Mode affects how meaning is created and how audiences receive texts.",
      skills: ["identifying mode", "explaining how mode shapes meaning", "comparing modes"]
    },
    {
      concept: "Representation",
      definition: "The way people, places, events and ideas are portrayed in texts. Representation involves selection, emphasis and omission, always reflecting a particular perspective.",
      skills: ["identifying representations", "analysing what is included/excluded", "evaluating perspective"]
    }
  ],

  composing: [
    {
      concept: "Sustaining a Personal Voice",
      definition: "Maintaining a consistent, distinctive authorial presence throughout a composed text, particularly through tone, register and stylistic choices.",
      skills: ["controlling tone", "using nuanced language", "maintaining register"]
    },
    {
      concept: "Text Structure",
      definition: "The organisation of a text — including sequencing, paragraphing, and use of structural conventions — to create coherence and achieve purpose.",
      skills: ["structuring argument", "using cohesive devices", "controlling pacing"]
    },
    {
      concept: "Imaginative and Stylistic Techniques",
      definition: "The deliberate use of literary and language devices to create specific effects — including imagery, symbolism, rhythm, and character — to engage audiences.",
      skills: ["using symbolism", "creating atmosphere", "crafting characters", "using imagery"]
    },
    {
      concept: "Nuanced Language",
      definition: "The precise and sophisticated use of language to convey subtle shades of meaning, emotion or argument beyond the literal or obvious.",
      skills: ["word choice", "connotation", "implication", "tone variation"]
    }
  ],

  responding: [
    {
      concept: "Close Analysis",
      definition: "The detailed examination of specific language features, structural choices and conventions in a text to explain how meaning is created.",
      skills: ["identifying specific techniques", "explaining effect", "embedding evidence"]
    },
    {
      concept: "Comparative Analysis",
      definition: "The examination of two or more texts to identify similarities and differences in their use of language, genre conventions, representation and context.",
      skills: ["linking texts meaningfully", "using comparative metalanguage", "evaluating similarities and differences"]
    },
    {
      concept: "Interpretation and Reader Positioning",
      definition: "The process by which audiences make meaning from texts, shaped by context, values, experiences and reading strategies. Different audiences may produce different interpretations.",
      skills: ["explaining personal interpretation", "considering alternative interpretations", "linking to context"]
    }
  ],

  comprehending: [
    {
      concept: "Inference and Implication",
      definition: "Reading beyond the literal to identify meanings that are suggested but not directly stated. Effective comprehension requires reading between the lines.",
      skills: ["identifying implied meaning", "using context clues", "explaining inferences"]
    },
    {
      concept: "Perspectives and Viewpoints",
      definition: "The particular angle, bias or standpoint from which a text presents its content. Identifying perspective involves recognising whose voice is dominant and what is omitted.",
      skills: ["identifying perspective", "evaluating bias", "considering omissions and inclusions"]
    }
  ]

};


/* ============================================================
   ENGLISH ATAR — MARKING KEY (Bob Hawke College)
   Source: Bob Hawke College English Department rubric
   Total: /40
   ============================================================ */

const ENGLISH_MARKING_KEY = {

  total: 40,
  note: "Used for responding and comprehending tasks. Composing tasks may use adapted descriptors focused on craft and language use.",

  criteria: [
    {
      name: "Engagement with the question",
      max_marks: 10,
      descriptors: [
        { marks: 10, label: "Perceptive, thoughtful and sustained", description: "Perceptive, thoughtful and sustained engagement with all parts of the question" },
        { marks: 9, label: "Thoughtful, clear and sustained", description: "Thoughtful, clear and sustained engagement with all parts of the question" },
        { marks: 8, label: "Clear and sustained", description: "Clear and sustained engagement with all parts of the question" },
        { marks: 7, label: "Clear — all parts", description: "Clear engagement with all parts of the question" },
        { marks: 6, label: "Clear — most parts", description: "Clear engagement with most parts of the question" },
        { marks: 5, label: "Mostly clear", description: "Mostly clear engagement with most parts of the question" },
        { marks: 4, label: "Satisfactory", description: "Satisfactory engagement with most parts of the question" },
        { marks: 3, label: "Inconsistent", description: "Inconsistent engagement with parts of the question" },
        { marks: 2, label: "Simplistic or partial", description: "Simplistic or partial engagement with part of the question" },
        { marks: 1, label: "Minimal or unclear", description: "Minimal or unclear engagement with the question" },
        { marks: 0, label: "No evidence", description: "No evidence to support this criterion" }
      ]
    },
    {
      name: "Understanding of syllabus concepts",
      max_marks: 10,
      descriptors: [
        { marks: 10, label: "Complex, well-developed and accurate", description: "A complex, well-developed and accurate understanding of all syllabus concepts related to the question" },
        { marks: 9, label: "Well-developed and accurate", description: "A well-developed and accurate understanding of all syllabus concepts related to the question" },
        { marks: 8, label: "Clear understanding of all", description: "A clear understanding of all syllabus concepts related to the question" },
        { marks: 7, label: "Mostly clear — all", description: "A mostly clear understanding of all syllabus concepts related to the question" },
        { marks: 6, label: "Satisfactory — all", description: "A satisfactory understanding of all syllabus concepts related to the question" },
        { marks: 5, label: "Simplistic — mostly", description: "A simplistic understanding of syllabus concepts mostly related to the question" },
        { marks: 4, label: "Partial or mixed", description: "A partial understanding of syllabus concepts related to the question and/or clear understanding of syllabus concepts unrelated to question" },
        { marks: 3, label: "Simplistic", description: "A simplistic understanding of syllabus concepts" },
        { marks: 2, label: "Vague", description: "A vague understanding of syllabus concepts" },
        { marks: 1, label: "Limited", description: "Limited understanding of syllabus concepts" },
        { marks: 0, label: "No evidence", description: "No evidence to support this criterion" }
      ]
    },
    {
      name: "Textual knowledge and evidence",
      max_marks: 10,
      descriptors: [
        { marks: 10, label: "Discerning integration", description: "A discerning integration of textual evidence and skilful, comprehensive analysis supported with accurate, appropriate metalanguage" },
        { marks: 9, label: "Purposeful, logical integration", description: "A purposeful, logical integration of relevant textual evidence with consistently effective analysis supported with appropriate metalanguage" },
        { marks: 8, label: "Clear and relevant integration", description: "A clear and relevant integration of textual evidence with effective analysis, supported with appropriate metalanguage" },
        { marks: 7, label: "Mostly effective selection", description: "A mostly effective selection and/or integration of textual evidence and some effective analysis, using appropriate metalanguage" },
        { marks: 6, label: "Adequate selection", description: "An adequate selection of textual evidence with some clear analysis, using some appropriate metalanguage" },
        { marks: 5, label: "Satisfactory selection", description: "A satisfactory selection of textual evidence with some analysis, using some appropriate metalanguage" },
        { marks: 4, label: "Simplistic selection", description: "A simplistic selection and discussion of textual evidence and/or limited use of metalanguage" },
        { marks: 3, label: "Partial or inconsistent", description: "A partial or inconsistent selection of textual evidence with minimal analysis and limited use of metalanguage" },
        { marks: 2, label: "Superficial", description: "A superficial selection or discussion of textual evidence, with inaccurate or inconsistent use of metalanguage/terminology" },
        { marks: 1, label: "Limited selection", description: "A limited selection or discussion of textual evidence, with minimal and/or no use of metalanguage/terminology" },
        { marks: 0, label: "No evidence", description: "No evidence to support this criterion" }
      ]
    },
    {
      name: "Expression and structure",
      max_marks: 10,
      descriptors: [
        { marks: 10, label: "Eloquently and effectively expressed", description: "Eloquently and effectively expressed within a cohesive and logical structure" },
        { marks: 9, label: "Clearly and effectively expressed", description: "Clearly and effectively expressed within a cohesive and logical structure" },
        { marks: 8, label: "Clearly expressed", description: "Clearly expressed within a logical structure" },
        { marks: 7, label: "Mostly clearly expressed", description: "Mostly clearly expressed within a logical structure" },
        { marks: 6, label: "Mostly clear — mostly logical", description: "Expressed in a mostly clear way within a mostly logical structure" },
        { marks: 5, label: "Mostly clear — partially logical", description: "Expressed in a mostly clear way and/or within a partially logical structure" },
        { marks: 4, label: "Some clarity", description: "Expressed with some clarity and/or simplistically structured" },
        { marks: 3, label: "Inconsistently expressed", description: "Expressed inconsistently with a loosely connected and/or unclear structure" },
        { marks: 2, label: "Unclearly expressed", description: "Expressed unclearly with occasional evidence of structural control" },
        { marks: 1, label: "Limited clarity", description: "Limited in clarity of expression and disjointed/minimal evidence of structure" },
        { marks: 0, label: "No evidence", description: "No evidence of this criterion" }
      ]
    }
  ]

};


/* ============================================================
   ENGLISH ATAR — EXEMPLARS
   ============================================================ */

const ENGLISH_EXEMPLARS = {

  responding: [
    {
      id: "eng_responding_1",
      title: "Dystopian Uniformity and the Suppression of the Individual",
      type: "analytical_response",
      task_type: "responding",
      texts: ["Nineteen Eighty-Four (Orwell)", "We (Zamyatin)"],
      approximate_mark: "38/40",
      grade_label: "High Band",
      notes: "Demonstrates perceptive engagement, complex understanding of syllabus concepts, discerning integration of textual evidence with accurate metalanguage, and eloquent expression throughout.",
      high_band_features: [
        "Opens with embedded textual evidence that immediately establishes the analytical argument",
        "Uses precise metalanguage throughout: 'propaganda', 'indoctrinate', 'dehumanises', 'conflation', 'paradoxical'",
        "Sustained comparative structure — not alternating between texts but genuinely synthesising them",
        "Non-obvious analysis: argues uniformity renders oppression invisible to those experiencing it",
        "Contemporary connection (fake news, QUT study 2017) demonstrates contextual awareness",
        "Avoids plot summary — every sentence performs analytical work",
        "Conclusion synthesises rather than repeats, with a resonant final observation about relevance"
      ],
      excerpt: "As O'Brien says to Winston in the Ministry of Love: '…power is collective. The individual only has power in so far as he ceases to be an individual.' It is from this chilling concept that dystopian societies are born. In these societies, often a typically totalitarian ruling elite aims to completely colonise an individual's thoughts, behaviours, and relationships, so that citizens who are enemies of the state in their 'separateness' are fashioned into living automatons fit to serve the State's every need."
    }
  ],

  composing: [
    {
      id: "eng_composing_1",
      title: "Persuasive Speech — Rare Earth Mining and Corporate Responsibility",
      type: "persuasive_speech",
      task_type: "composing",
      approximate_mark: "38/40",
      grade_label: "High Band",
      notes: "Demonstrates discerning use of persuasive speech conventions, sophisticated use of stylistic devices, and effective organisation. Annotated against WACE criteria.",
      high_band_features: [
        "Speaker identity and context established immediately — creates credibility and situates argument",
        "Uses tripling for rhetorical impact: 'immoral, it is unjust and it cannot go on'",
        "Statistics embedded naturally: '$5 a day' vs '$500–$1000' smartphone — stark economic contrast",
        "Anticipates counter-argument and dismantles it: 'I know what you're thinking...'",
        "Builds to a call to action with specific, actionable recommendations (Fairphone, gesi.org)",
        "Repeating rhetorical question pattern: 'Where is the dignity... Where is the respect...'",
        "Uses second person ('you and I') to implicate audience and build shared responsibility"
      ],
      excerpt: "I wonder how many of us really know what goes into making Samsung's new slimmer tablet or Apple's newest iPhone? The answer is the mining of rare earth minerals without which none of these devices can work. The unsettling truth about how these minerals are mined is probably not what you want to hear, but it has been kept under wraps for long enough."
    }
  ],

  comprehending: []

};


/* ============================================================
   AI WRITER — SKILL FEEDBACK PROMPTS
   Used to construct Gemini prompts for each skill
   ============================================================ */

const SKILL_FEEDBACK_PROMPTS = {

  literature: {

    engagement: {
      label: "Engagement with the question",
      prompt_instruction: "Assess how directly and specifically the highlighted text addresses the exact task set in the question. Identify any drift, tangential material, or moments where the student answers a different question to the one asked. Suggest a rewrite that sharpens focus on the actual task words."
    },

    syllabus_concepts: {
      label: "Application of syllabus concepts",
      prompt_instruction: "Assess whether the highlighted text uses WACE Literature ATAR course concepts (ideology, discourse, representation, reading strategies, intertextuality, reader positioning, etc.) accurately and with depth. Identify where concepts are named but not applied, or where deeper application would strengthen the argument. Suggest a rewrite that embeds the concept more meaningfully."
    },

    textual_evidence: {
      label: "Use and embedding of textual evidence",
      prompt_instruction: "Assess how well the student integrates textual evidence. Look for: dropped quotations (evidence not introduced or followed up), quotations that don't directly support the claim, and missed opportunities to use evidence from the student's quote bank. Suggest a rewrite showing how to embed a quotation smoothly with a colon or syntactic integration, and follow up with precise analysis."
    },

    terminology: {
      label: "Linguistic, stylistic and critical terminology",
      prompt_instruction: "Assess the accuracy and sophistication of literary and critical terminology used. Identify: vague or generic terms that should be replaced with precise ones, any misuse of terms, and opportunities to use more sophisticated critical vocabulary. Suggest a rewrite using more precise and appropriate terminology."
    },

    sophistication: {
      label: "Sophistication of ideas and non-dominant readings",
      prompt_instruction: "Assess the depth and originality of the student's ideas. Identify where the argument is surface-level, obvious, or paraphrases the plot rather than offering critical insight. Flag opportunities to pursue a non-dominant or unexpected reading. Suggest a rewrite that develops a more nuanced, unexpected, or complex interpretive claim."
    },

    expression: {
      label: "Expression, language style and structure",
      prompt_instruction: "Assess the quality of the student's writing at the sentence and paragraph level. Look for: unclear or wordy sentences, weak paragraph openings, lack of cohesion between sentences, and passive or vague constructions. Suggest a rewrite that is more sophisticated, clear and structurally controlled."
    },

    general: {
      label: "General feedback",
      prompt_instruction: "Provide a holistic assessment of the highlighted passage. Identify the single most impactful improvement the student could make to this section, and explain why it would significantly improve the mark. Suggest a revised version of the passage."
    }

  },

  english: {

    engagement_task: {
      label: "Engagement with the question/task",
      prompt_instruction: "Assess how directly the highlighted text addresses the specific task set. Identify any tangential material or where the student deviates from the task requirements. Suggest a rewrite that more purposefully and directly answers what is being asked."
    },

    language_features: {
      label: "Language features and techniques",
      prompt_instruction: "Assess the student's identification and analysis of language features. Look for: features named but not explained, analysis that describes rather than analyses effect, and missed opportunities to identify relevant techniques. Suggest a rewrite that demonstrates the effect of the language feature more precisely."
    },

    structure_org: {
      label: "Structure and organisation",
      prompt_instruction: "Assess how well the highlighted section is organised. Look for: unclear topic sentences, ideas that are not sequenced logically, and lack of cohesive devices. Suggest a rewrite that improves the internal logic and flow of the section."
    },

    sophistication_eng: {
      label: "Sophistication of ideas",
      prompt_instruction: "Assess the depth and complexity of the student's thinking. Identify where the response is descriptive or surface-level rather than genuinely analytical. Suggest a rewrite that develops a more complex, layered or nuanced point."
    },

    evidence_eng: {
      label: "Use of evidence and reference to text",
      prompt_instruction: "Assess how well the student integrates textual evidence. Look for dropped quotations, evidence that doesn't directly support the claim, and lack of follow-up analysis. Suggest a rewrite showing precise integration and analysis of evidence."
    },

    expression_eng: {
      label: "Expression and style",
      prompt_instruction: "Assess the quality of the student's written expression. Look for unclear sentence construction, wordiness, inappropriate register, and lack of precision. Suggest a rewrite that is more clear, precise and appropriately expressed."
    },

    general_eng: {
      label: "General feedback",
      prompt_instruction: "Provide a holistic assessment of the highlighted passage. Identify the single most impactful improvement and suggest a revised version of the section."
    }

  }

};


/* ============================================================
   GEMINI SYSTEM PROMPTS
   Base prompt templates assembled in app.js
   ============================================================ */

const GEMINI_PROMPTS = {

  question_generation_literature: `You are a WACE English Literature ATAR examiner at the level of the SCSA chief examiner. Your task is to generate a NEW exam question for the student to practise.

RULES:
- The question must be novel — do not repeat any question from the past 5 years provided below
- The question must be genuinely aligned with the WACE Literature ATAR Year 12 syllabus concepts
- The question must be at Task 3 difficulty — it requires an extended analytical essay response
- Prioritise concepts and angles that have NOT appeared in the past 5 years (underrepresented areas)
- The question should be applicable to the student's specific studied text (title and author provided)
- Write ONE question only, with no preamble, no explanation, and no numbering
- The question should be 1-2 sentences maximum

UNDERREPRESENTED CONCEPTS TO CONSIDER (based on past paper analysis):
- Reader's social position or gender explicitly shaping interpretation
- How discourse positions marginalised voices
- The relationship between aesthetic effect and ideological work
- Non-dominant readings generated by applying specific critical lenses (feminist, Marxist, postcolonial)
- How the author's context shapes representation in ways that are visible to contemporary readers
- Intertextuality as a tool of ideological reinforcement`,

  question_generation_english: `You are a WACE English ATAR examiner at the level of the SCSA chief examiner. Your task is to generate a NEW exam question for the student to practise.

RULES:
- The question must be novel — do not repeat any question from the past 5 years provided
- The question must align with the WACE English ATAR Year 12 syllabus
- It must match the section: COMPOSING, RESPONDING, or COMPREHENDING as specified
- Write ONE question only, with no preamble or numbering
- For COMPOSING: provide a clear creative or persuasive task with a specific angle
- For RESPONDING: focus on language analysis, genre conventions, context, perspective or comparison
- For COMPREHENDING: generate a short written stimulus text (200-300 words) followed by 2-3 questions`,

  ai_writer_base: `You are a WACE English ATAR/Literature ATAR writing coach working with a Year 12 student at Bob Hawke College, Perth, Western Australia.

Your role is to provide specific, targeted writing improvement for the highlighted section of their response.

CRITICAL FORMAT RULES — follow EXACTLY:
- Each section starts on a new line with its label and colon
- ASSESSMENT: one paragraph, max 3 sentences, about the highlighted text only
- WHY THIS MATTERS: one sentence max, links directly to the marking criterion
- SUGGESTED REWRITE: the improved version of ONLY the highlighted text — same length as original, not a full paragraph rewrite
- EXPLANATION: one sentence max explaining the key change made
- No asterisks, no markdown, no bullet points inside any section
- Never rewrite content the student did not highlight

Format your response EXACTLY like this:
ASSESSMENT: [your assessment here]
WHY THIS MATTERS: [one sentence]
SUGGESTED REWRITE: [the rewrite of only the highlighted text]
EXPLANATION: [one sentence]`,

  free_writing_review: `You are a WACE English ATAR/Literature ATAR writing coach. You are reviewing a student's draft in progress.

Your task is to identify the 3 most impactful improvements the student could make RIGHT NOW.

RULES:
- Be specific — quote the student's actual words when identifying problems
- Link each suggestion to a marking criterion
- Provide a concrete rewrite suggestion for each
- Do not praise — only identify improvements
- Format as exactly 3 suggestion objects, each with:
  PARAGRAPH: (which paragraph this relates to — first sentence of that paragraph)
  SKILL: (which skill category this falls under)
  ORIGINAL: (the specific sentence or phrase to improve — quote it exactly)
  IMPROVED: (your suggested rewrite)
  WHY: (one sentence explanation)`,

  marking_base: `You are a WACE chief examiner marking a Year 12 student's exam response. You mark exactly as a WACE external examiner marks — without charity, without guessing at what the student meant to say, and strictly against the marking descriptors provided.

MARKING RULES:
- Mark what is ON THE PAGE. Not what you think the student meant.
- Use the exact marking descriptors provided — match the response to the closest descriptor for each criterion.
- Quote specific evidence from the student's response to justify every mark given.
- Do not moderate upward. If the response sits between two descriptors, give the lower mark unless there is clear evidence for the higher one.
- Your overall examiner comment should be written in the register of a WACE chief examiner's report — direct, professional, and honest.
- Format your response as valid JSON matching the structure specified.`,

  top_band_example: `You are a WACE English ATAR/Literature ATAR chief examiner. Generate a model top-band paragraph responding to the question provided.

RULES:
- This paragraph should demonstrate all marking criteria at their highest descriptor level
- It should be for the same studied text as the student's response
- It should NOT repeat the student's approach or argument — offer a different angle
- Use sophisticated, controlled language
- Embed textual evidence smoothly
- Apply course concepts with depth and precision
- After the paragraph, provide 3 brief annotations explaining what makes it top-band`

};


/* ============================================================
   APP CONFIG
   ============================================================ */

const APP_CONFIG = {
  gemini_model: "gemini-2.5-flash",
  gemini_api_endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  free_writing_review_interval_ms: 180000,
  autosave_interval_ms: 30000,
  timer_warning_threshold_seconds: 300,
  max_question_regenerations: 1,
  reading_time_seconds: 300,
  version: "1.1.0"
};

/* ============================================================
   TERMINOLOGY BANKS
   ============================================================ */

const LITERATURE_TERMINOLOGY = [
  { term: "ideology", definition: "A system of values, beliefs and assumptions held by a group, often naturalised through texts to serve dominant interests." },
  { term: "discourse", definition: "A way of thinking and speaking about the world that shapes how reality is represented. Texts operate within and reproduce discourses." },
  { term: "intertextuality", definition: "The relationship between texts, where one text references, echoes or responds to others, shaping meaning through these connections." },
  { term: "hegemony", definition: "The process by which dominant groups maintain power not through force but through cultural consent and the naturalisation of their values." },
  { term: "marginalisation", definition: "The process of representing certain groups or perspectives as peripheral, minor or inferior within a text." },
  { term: "naturalise", definition: "To make ideological constructs appear normal, inevitable or common sense rather than the product of a particular worldview." },
  { term: "representation", definition: "The way language constructs people, places, events and ideas — never a neutral reflection of reality but always a selective construction." },
  { term: "reader positioning", definition: "The ways in which a text encourages readers to adopt particular attitudes, values or responses." },
  { term: "dominant reading", definition: "The interpretation that aligns with the preferred or intended meaning of the text, accepting its ideological assumptions." },
  { term: "resistant reading", definition: "An interpretation that reads against the grain of the text, challenging or refusing its ideological assumptions." },
  { term: "non-dominant reading", definition: "An interpretation that prioritises perspectives marginalised by the text or offers an alternative to the dominant reading." },
  { term: "symptomatic reading", definition: "A reading that examines what a text reveals about underlying social or ideological tensions, including what it represses or silences." },
  { term: "genre", definition: "A category of text defined by shared conventions, features and reader expectations. Genres carry ideological and aesthetic functions." },
  { term: "aesthetic function", definition: "The ways in which literary techniques create beauty, pleasure or artistic effect, beyond purely ideological purposes." },
  { term: "form", definition: "The structural and generic choices that shape a text — including genre, mode, medium and organisation." },
  { term: "metalanguage", definition: "Language used to describe and analyse language — critical and linguistic terminology used to discuss how texts work." },
  { term: "connotation", definition: "The associations and implied meanings of a word or image beyond its literal or denotative meaning." },
  { term: "denotation", definition: "The literal, dictionary definition of a word, as opposed to its connotative or implied meaning." },
  { term: "focalization", definition: "The perspective through which narrative events are presented — who 'sees' the story, which shapes what readers know and feel." },
  { term: "polysemy", definition: "The capacity of a text or sign to carry multiple meanings simultaneously, allowing for a range of interpretations." },
  { term: "subversion", definition: "The undermining or challenging of dominant conventions, values or expectations within a text." },
  { term: "cultural capital", definition: "Knowledge, skills and cultural references that have value within a particular society and are often embedded in literary texts." },
  { term: "othering", definition: "The process of representing groups as fundamentally different from a dominant 'us', reinforcing cultural hierarchies." },
  { term: "binary opposition", definition: "A pair of contrasting concepts or values positioned against each other in a text, often with one privileged over the other." },
  { term: "epistolary", definition: "A form of narrative constructed through letters or documents." },
  { term: "free indirect discourse", definition: "A narrative technique blending third-person narration with the character's own thoughts and voice." },
  { term: "dramatic irony", definition: "When the audience knows something characters do not, creating tension or additional meaning." },
  { term: "soliloquy", definition: "A dramatic monologue in which a character speaks their inner thoughts aloud, usually alone on stage." },
  { term: "motif", definition: "A recurring image, symbol or idea within a text that accumulates meaning across its repetitions." },
  { term: "juxtaposition", definition: "The placement of contrasting elements side by side to highlight differences or create irony." }
];

const ENGLISH_TERMINOLOGY = [
  { term: "language features", definition: "Specific choices of vocabulary, syntax, tone and figurative language a composer uses to create meaning." },
  { term: "generic conventions", definition: "The recognisable features associated with particular genres that shape audience expectations and responses." },
  { term: "mode", definition: "The form or channel through which a text is delivered — written, spoken, visual or multimodal." },
  { term: "register", definition: "The level of formality of language, adjusted to suit context, purpose and audience." },
  { term: "voice", definition: "The distinctive personality, tone and perspective of the narrator or speaker as constructed through language choices." },
  { term: "perspective", definition: "The particular viewpoint or angle from which a text presents its content, always reflecting specific values." },
  { term: "rhetorical question", definition: "A question posed for effect rather than to elicit an answer, used to engage and position an audience." },
  { term: "tripling", definition: "The use of three parallel words, phrases or clauses for rhythmic and rhetorical emphasis." },
  { term: "anaphora", definition: "The deliberate repetition of a word or phrase at the beginning of successive clauses for rhetorical effect." },
  { term: "juxtaposition", definition: "Placing contrasting ideas or images side by side to highlight difference and generate meaning." },
  { term: "ethos", definition: "An appeal to the credibility or character of the speaker to establish trust with the audience." },
  { term: "pathos", definition: "An appeal to the emotions of the audience to generate sympathy, outrage or connection." },
  { term: "logos", definition: "An appeal to logic and reason, often through evidence, statistics or reasoned argument." },
  { term: "satire", definition: "A mode of writing that uses irony, humour or exaggeration to critique social, political or cultural issues." },
  { term: "irony", definition: "A gap between what is said and what is meant, or between expectation and reality, used for critical or comic effect." },
  { term: "allusion", definition: "An indirect reference to another text, event or cultural figure that enriches meaning for readers who recognise it." },
  { term: "symbolism", definition: "The use of objects, characters or settings to represent abstract ideas or values." },
  { term: "imagery", definition: "Descriptive language that appeals to the senses to create vivid mental pictures." },
  { term: "metaphor", definition: "A direct comparison between two unlike things, asserting that one is the other to transfer qualities." },
  { term: "simile", definition: "A comparison using 'like' or 'as' to highlight a resemblance between two unlike things." },
  { term: "tone", definition: "The attitude or feeling conveyed by the writer or speaker through their language choices." },
  { term: "cohesion", definition: "The way a text holds together through linguistic devices such as pronouns, connectives and lexical repetition." },
  { term: "syntax", definition: "The arrangement of words and phrases to create well-formed sentences — sentence structure choices carry meaning." },
  { term: "diction", definition: "A writer's specific word choices and vocabulary, which shape tone, meaning and audience positioning." },
  { term: "omniscient narrator", definition: "A narrator who has access to all characters' thoughts and feelings, with a god-like perspective." },
  { term: "first-person narrator", definition: "A narrator who speaks as 'I', offering an intimate but limited and potentially unreliable perspective." },
  { term: "unreliable narrator", definition: "A narrator whose account cannot be fully trusted, often due to bias, limited knowledge or psychological instability." },
  { term: "subtext", definition: "Meaning that is implied beneath the surface of a text rather than stated explicitly." },
  { term: "context of production", definition: "The circumstances in which a text was created, including historical, social and cultural factors." },
  { term: "context of reception", definition: "The circumstances in which a text is read or viewed, which shape how audiences interpret it." }
];

/* ============================================================
   SYNONYM / REGISTER UPGRADE BANK (Feature 32)
   Maps common weak words → higher register alternatives
   ============================================================ */
const SYNONYM_BANK = {
  // Verbs — showing/demonstrating
  'shows':      [{ word: 'delineates',   register: 'analytical' }, { word: 'illuminates', register: 'analytical' }, { word: 'underscores', register: 'critical' }],
  'show':       [{ word: 'delineate',    register: 'analytical' }, { word: 'illuminate',  register: 'analytical' }, { word: 'underscore',  register: 'critical' }],
  'reveals':    [{ word: 'exposes',      register: 'critical'   }, { word: 'lays bare',   register: 'critical'   }, { word: 'foregrounds', register: 'literary' }],
  'reveal':     [{ word: 'expose',       register: 'critical'   }, { word: 'foreground',  register: 'literary'   }, { word: 'elucidate',   register: 'analytical' }],
  'uses':       [{ word: 'employs',      register: 'analytical' }, { word: 'deploys',     register: 'analytical' }, { word: 'harnesses',   register: 'critical' }],
  'use':        [{ word: 'employ',       register: 'analytical' }, { word: 'deploy',      register: 'analytical' }, { word: 'utilise',     register: 'formal' }],
  'creates':    [{ word: 'constructs',   register: 'critical'   }, { word: 'establishes', register: 'analytical' }, { word: 'engenders',   register: 'literary' }],
  'create':     [{ word: 'construct',    register: 'critical'   }, { word: 'establish',   register: 'analytical' }, { word: 'engender',    register: 'literary' }],
  'shows that': [{ word: 'demonstrates', register: 'analytical' }, { word: 'suggests',    register: 'critical'   }, { word: 'implies',     register: 'nuanced' }],
  'suggests':   [{ word: 'intimates',    register: 'literary'   }, { word: 'insinuates',  register: 'critical'   }, { word: 'posits',      register: 'analytical' }],
  'highlights': [{ word: 'foregrounds',  register: 'literary'   }, { word: 'accentuates', register: 'analytical' }, { word: 'draws attention to', register: 'analytical' }],
  'highlight':  [{ word: 'foreground',   register: 'literary'   }, { word: 'accentuate',  register: 'analytical' }, { word: 'emphasise',   register: 'formal' }],
  'looks at':   [{ word: 'examines',     register: 'analytical' }, { word: 'interrogates', register: 'critical'  }, { word: 'scrutinises', register: 'analytical' }],
  'talks about':[{ word: 'addresses',    register: 'analytical' }, { word: 'explores',    register: 'analytical' }, { word: 'engages with', register: 'critical' }],
  'makes':      [{ word: 'constructs',   register: 'critical'   }, { word: 'fashions',    register: 'literary'   }, { word: 'fabricates',  register: 'critical' }],
  'shows us':   [{ word: 'presents',     register: 'analytical' }, { word: 'offers',      register: 'critical'   }, { word: 'affords',     register: 'literary' }],
  // Nouns
  'idea':       [{ word: 'notion',       register: 'formal'     }, { word: 'premise',     register: 'analytical' }, { word: 'proposition', register: 'academic' }],
  'ideas':      [{ word: 'notions',      register: 'formal'     }, { word: 'premises',    register: 'analytical' }, { word: 'ideologies',  register: 'critical' }],
  'theme':      [{ word: 'preoccupation', register: 'literary'  }, { word: 'motif',       register: 'literary'   }, { word: 'concern',     register: 'critical' }],
  'society':    [{ word: 'social milieu', register: 'critical'  }, { word: 'cultural context', register: 'analytical' }, { word: 'the broader polity', register: 'academic' }],
  'character':  [{ word: 'protagonist',  register: 'literary'   }, { word: 'figure',      register: 'literary'   }, { word: 'persona',     register: 'critical' }],
  'reader':     [{ word: 'audience',     register: 'analytical' }, { word: 'the implied reader', register: 'literary' }, { word: 'the readership', register: 'formal' }],
  'book':       [{ word: 'text',         register: 'academic'   }, { word: 'work',        register: 'formal'     }, { word: 'narrative',   register: 'literary' }],
  'story':      [{ word: 'narrative',    register: 'literary'   }, { word: 'text',        register: 'academic'   }, { word: 'diegesis',    register: 'advanced' }],
  'feelings':   [{ word: 'affect',       register: 'academic'   }, { word: 'interiority', register: 'literary'   }, { word: 'emotional register', register: 'critical' }],
  // Adjectives
  'bad':        [{ word: 'pernicious',   register: 'formal'     }, { word: 'insidious',   register: 'critical'   }, { word: 'inimical',    register: 'academic' }],
  'good':       [{ word: 'salutary',     register: 'formal'     }, { word: 'efficacious', register: 'academic'   }, { word: 'propitious',  register: 'literary' }],
  'important':  [{ word: 'significant',  register: 'analytical' }, { word: 'pivotal',     register: 'analytical' }, { word: 'seminal',     register: 'academic' }],
  'big':        [{ word: 'substantial',  register: 'formal'     }, { word: 'considerable', register: 'analytical' }, { word: 'pronounced',  register: 'academic' }],
  'different':  [{ word: 'divergent',    register: 'analytical' }, { word: 'disparate',   register: 'academic'   }, { word: 'antithetical', register: 'critical' }],
  'similar':    [{ word: 'analogous',    register: 'academic'   }, { word: 'commensurate', register: 'formal'    }, { word: 'consonant',   register: 'critical' }],
};

/* ============================================================
   WEAK WORD LIST (Feature 34 — Vocab report)
   ============================================================ */
const WEAK_WORDS = [
  { word: 'shows',    alternatives: ['demonstrates','delineates','illuminates','underscores'] },
  { word: 'uses',     alternatives: ['employs','deploys','harnesses','utilises'] },
  { word: 'creates',  alternatives: ['constructs','engenders','establishes','fashions'] },
  { word: 'is',       alternatives: null }, // structural — flagged by count only
  { word: 'has',      alternatives: null },
  { word: 'makes',    alternatives: ['constructs','fashions','fabricates','renders'] },
  { word: 'gets',     alternatives: ['obtains','acquires','attains','secures'] },
  { word: 'thing',    alternatives: ['element','feature','aspect','component'] },
  { word: 'things',   alternatives: ['elements','features','aspects','components'] },
  { word: 'very',     alternatives: ['particularly','notably','markedly','considerably'] },
  { word: 'really',   alternatives: ['fundamentally','genuinely','demonstrably','particularly'] },
  { word: 'also',     alternatives: ['furthermore','moreover','additionally','equally'] },
  { word: 'but',      alternatives: ['however','yet','nonetheless','conversely'] },
  { word: 'because',  alternatives: ['given that','since','as a consequence of','insofar as'] },
  { word: 'so',       alternatives: ['consequently','therefore','thus','as a result'] },
  { word: 'a lot',    alternatives: ['considerably','markedly','extensively','substantially'] },
  { word: 'looks at', alternatives: ['examines','interrogates','scrutinises','explores'] },
  { word: 'talks',    alternatives: ['addresses','explores','articulates','conveys'] },
  { word: 'feels',    alternatives: ['experiences','registers','perceives','apprehends'] },
  { word: 'good',     alternatives: ['effective','salient','compelling','significant'] },
  { word: 'bad',      alternatives: ['pernicious','insidious','detrimental','inimical'] },
  { word: 'important',alternatives: ['significant','pivotal','crucial','consequential'] },
  { word: 'idea',     alternatives: ['notion','premise','proposition','conceptualisation'] },
  { word: 'shows that',alternatives:['demonstrates','suggests','implies','intimates'] },
];
