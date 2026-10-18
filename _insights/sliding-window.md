---
title: "滑动窗口的适用边界"
date: 2026-10-01
tags: [算法, 滑动窗口]
---

滑动窗口适用于「满足条件的最长/最短子串」类问题，核心是维护一个合法窗口。

当窗口扩张破坏合法性时，收缩左边界直到再次合法，全程只需一次遍历。

## 什么时候用滑动窗口

1. 问题求的是**连续子数组/子串**的最优解
2. 窗口的合法性可以用**单调性**判断：右指针扩张只会让窗口更"不合法"，左指针收缩只会让窗口更"合法"

## 模板

```python
def sliding_window(s):
    window = set()  # 或 dict / Counter
    l = 0
    ans = 0
    for r, ch in enumerate(s):
        # 1. 扩张：把 ch 加入窗口
        window.add(ch)
        # 2. 收缩：窗口不合法时移动左指针
        while not is_valid(window):
            window.remove(s[l])
            l += 1
        # 3. 更新答案
        ans = max(ans, r - l + 1)
    return ans
```

## 边界提醒

- 收缩条件写错（`while` 写成 `if`）是最常见的 bug
- 窗口内用 `set` 还是 `Counter` 取决于是否允许重复字符
- 求最短窗口时，收缩循环里也要更新答案
