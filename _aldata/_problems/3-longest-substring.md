---
title: "无重复字符的最长子串"
difficulty: 中等
tags: [字符串, 滑动窗口]
---

## 题目描述

给定一个字符串 `s`，请你找出其中不含有重复字符的最长子串的长度。

## 思路

滑动窗口 + 哈希集合。用左右指针维护一个无重复字符的窗口：右指针扩张，若遇到重复字符则移动左指针直到窗口内无重复。

- 时间复杂度：O(n)
- 空间复杂度：O(Σ)，Σ 为字符集大小

## C++ 解法

```cpp
#include <string>
#include <unordered_set>
using namespace std;

class Solution {
public:
    int lengthOfLongestSubstring(string s) {
        unordered_set<char> st;
        int l = 0, ans = 0;
        for (int r = 0; r < s.size(); ++r) {
            while (st.count(s[r])) {
                st.erase(s[l++]);
            }
            st.insert(s[r]);
            ans = max(ans, r - l + 1);
        }
        return ans;
    }
};
```

## Python 解法

```python
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        seen = set()
        l = 0
        ans = 0
        for r, ch in enumerate(s):
            while ch in seen:
                seen.remove(s[l])
                l += 1
            seen.add(ch)
            ans = max(ans, r - l + 1)
        return ans
```
