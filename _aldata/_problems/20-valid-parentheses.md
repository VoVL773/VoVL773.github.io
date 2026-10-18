---
title: "有效的括号"
difficulty: 简单
tags: [栈, 字符串]
---

## 题目描述

给定一个只包括 `(`、`)`、`{`、`}`、`[`、`]` 的字符串 `s`，判断字符串是否有效。

有效字符串需满足：
1. 左括号必须用相同类型的右括号闭合。
2. 左括号必须以正确的顺序闭合。
3. 每个右括号都有一个对应的相同类型的左括号。

## 思路

用栈匹配括号。遇到左括号入栈，遇到右括号则检查栈顶是否为对应的左括号：若是则弹栈，否则无效。最后栈必须为空。

- 时间复杂度：O(n)
- 空间复杂度：O(n)

## C++ 解法

```cpp
#include <string>
#include <stack>
using namespace std;

class Solution {
public:
    bool isValid(string s) {
        stack<char> st;
        for (char c : s) {
            if (c == '(' || c == '{' || c == '[') {
                st.push(c);
            } else {
                if (st.empty()) return false;
                char top = st.top();
                if ((c == ')' && top != '(') ||
                    (c == '}' && top != '{') ||
                    (c == ']' && top != '[')) return false;
                st.pop();
            }
        }
        return st.empty();
    }
};
```

## Python 解法

```python
class Solution:
    def isValid(self, s: str) -> bool:
        stack = []
        pairs = {')': '(', '}': '{', ']': '['}
        for ch in s:
            if ch in pairs:
                if not stack or stack[-1] != pairs[ch]:
                    return False
                stack.pop()
            else:
                stack.append(ch)
        return not stack
```
