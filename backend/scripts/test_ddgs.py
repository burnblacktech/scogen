
from duckduckgo_search import DDGS

def test_search():
    print("Testing DDGS...")
    try:
        with DDGS() as ddgs:
            results = ddgs.text("python technology stack 2025", max_results=2)
            print(f"Results type: {type(results)}")
            results_list = list(results)
            print(f"Results count: {len(results_list)}")
            for r in results_list:
                print(f"Title: {r['title']}")
                print(f"Body: {r['body']}")
                print("-" * 10)
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_search()
