from ml.llm_bridge import scrub_tech_tags

def test_scrubber():
    test_cases = [
        {
            "input": "<think>Wait, I should be helpful.</think> [EMOTION: joy] Hello doctor, the patient is fine.",
            "expected": "Hello doctor, the patient is fine."
        },
        {
            "input": "Check this link: https://example.com [ACTION: NONE]",
            "expected": "Check this link:"
        },
        {
            "input": "<think>Thinking...</think>This is a [TEST] message with ［FULLWIDTH］ brackets.",
            "expected": "This is a  message with  brackets."
        },
        {
            "input": "<think>\nMulti-line\nthought\n</think>Clean result.",
            "expected": "Clean result."
        }
    ]

    for i, case in enumerate(test_cases):
        actual = scrub_tech_tags(case["input"])
        print(f"Test {i+1}: {'PASS' if actual == case['expected'] else 'FAIL'}")
        if actual != case['expected']:
            print(f"  Input:    {repr(case['input'])}")
            print(f"  Expected: {repr(case['expected'])}")
            print(f"  Actual:   {repr(actual)}")

if __name__ == "__main__":
    test_scrubber()
