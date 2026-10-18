---
title: "两数相加"
difficulty: 中等
tags: [链表, 数学]
---

## 题目描述

给你两个非空链表，表示两个非负整数。每位数字都以逆序方式存储，请你将两数相加，并以相同形式返回一个表示和的链表。

你可以假设除了数字 0 之外，这两个数都不会以 0 开头。

## 思路

逐位相加，维护进位 `carry`。两个链表同步遍历，当其中一个链表走完时用 0 补齐。最后若 `carry > 0` 则新增一个节点。

- 时间复杂度：O(max(m, n))
- 空间复杂度：O(max(m, n))

## C++ 解法

```cpp
struct ListNode {
    int val;
    ListNode *next;
    ListNode(int x) : val(x), next(nullptr) {}
};

class Solution {
public:
    ListNode* addTwoNumbers(ListNode* l1, ListNode* l2) {
        ListNode dummy(0);
        ListNode* cur = &dummy;
        int carry = 0;
        while (l1 || l2 || carry) {
            int sum = carry;
            if (l1) { sum += l1->val; l1 = l1->next; }
            if (l2) { sum += l2->val; l2 = l2->next; }
            carry = sum / 10;
            cur->next = new ListNode(sum % 10);
            cur = cur->next;
        }
        return dummy.next;
    }
};
```

## Python 解法

```python
# Definition for singly-linked list.
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def addTwoNumbers(self, l1, l2):
        dummy = ListNode()
        cur = dummy
        carry = 0
        while l1 or l2 or carry:
            s = carry
            if l1:
                s += l1.val
                l1 = l1.next
            if l2:
                s += l2.val
                l2 = l2.next
            carry = s // 10
            cur.next = ListNode(s % 10)
            cur = cur.next
        return dummy.next
```
