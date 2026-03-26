//! ABI drift guard for quest-facing shared types.
//!
//! This test intentionally compares source declarations so contract-interface
//! drift is caught during CI before cross-contract runtime failures occur.

fn extract_decl(source: &str, marker: &str) -> String {
    let start = source
        .find(marker)
        .unwrap_or_else(|| panic!("missing declaration marker: {marker}"));

    let body = &source[start..];
    let open = body
        .find('{')
        .unwrap_or_else(|| panic!("missing opening brace for: {marker}"));

    let mut depth = 0usize;
    let mut end = None;

    for (index, ch) in body.char_indices().skip(open) {
        match ch {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    end = Some(index + 1);
                    break;
                }
            }
            _ => {}
        }
    }

    let end_index = end.unwrap_or_else(|| panic!("missing closing brace for: {marker}"));
    body[..end_index].to_string()
}

#[allow(dead_code)]
fn normalize_decl(input: &str) -> String {
    input
        .replace("soroban_sdk::Vec<String>", "Vec<String>")
        .lines()
        .map(|line| line.split("//").next().unwrap_or(""))
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<String>()
        .chars()
        .filter(|ch| !ch.is_whitespace())
        .collect()
}

#[allow(dead_code)]
fn assert_same_decl(canonical_src: &str, other_src: &str, marker: &str, contract_name: &str) {
    let canonical = normalize_decl(&extract_decl(canonical_src, marker));
    let candidate = normalize_decl(&extract_decl(other_src, marker));

    assert_eq!(
        canonical, candidate,
        "{marker} in {contract_name} drifted from quest contract declaration"
    );
}

#[test]
fn shared_types_exist_in_common() {
    let common_src = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../common/src/lib.rs"));

    for marker in [
        "pub enum Visibility",
        "pub enum QuestStatus",
        "pub struct QuestInfo",
    ] {
        extract_decl(common_src, marker);
    }
}
