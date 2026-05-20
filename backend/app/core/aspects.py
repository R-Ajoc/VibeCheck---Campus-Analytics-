ASPECTS = {
    "Academic Stress": (
        "midterms finals exams quiz quizzes exam grading grades assignment workload "
        "homework projects thesis requirements study cramming brutal failure failure passing "
        "stress stressful schedule heavy pressure fast-paced deadlines syllabus course major"
    ),
    "Faculty Behavior": (
        "professor professors teacher teachers faculty adviser instruction lecturing "
        "unfair disengaged disengagement slides reading dismissive attitude rude strict "
        "absent attendance teaching style clear guidance helpful unhelpful academic integrity"
    ),
    "Administration": (
        "registrar registrar's office cashier lines queue waiting enrollment pre-enrollment "
        "billing accounting finance system portal website clearance staff schedule advising "
        "paperwork long lines slow response delay transactions process office"
    ),
    "Campus Facilities": (
        "campus building library classroom classrooms lab laboratory gym gymnasium grounds "
        "comfort room toilet restroom bathroom study pods desk chairs aircon air conditioning "
        "broken ventilation parking garden building space renovation infrastructure maintenance"
    ),
    "Student Politics": (
        "ssg student council elections campaign organization org officers politics vote voters "
        "representation leadership projects budget issues stance conflict campus events intramurals "
        "school spirit highlight student body representation"
    ),
    "Student Mental Health": (
        "guidance counselor counseling office support mental health anxiety overwhelmed "
        "pressure lonely bearable exhaustion guidance exhaust breakdown listening advice clinic"
    ),
    "Tuition & Costs": (
        "tuition scholarship miscellaneous fees cost expensive cheap affordable budget student "
        "prices financial breakdown charge money payment scholar allowance rate wallet"
    ),
    "Transit & Services": (
        "shuttle transit transport bus ride commute parking driver timing route morning "
        "canteen cafeteria food options meals drink lunch breakfast table stall vendors line price"
    ),
}

# This safely maps them out while processing text tokens seamlessly
ASPECT_KEYWORDS = {
    aspect: set(keywords.lower().split())
    for aspect, keywords in ASPECTS.items()
}