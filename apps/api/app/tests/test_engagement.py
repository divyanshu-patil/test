from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from app.tests.conftest import register
from app.tests.test_posts import upload


def login_as(client, username):
    client.cookies.clear()
    r = client.post("/api/v1/auth/login", json={"identifier": username, "password": "secret123"})
    assert r.status_code == 200
    client.headers["x-csrf-token"] = client.cookies["socially_csrf"]


def test_like_unlike_is_idempotent_and_reflected_in_feed(client):
    register(client, "alice")
    pid = upload(client).json()["id"]
    url = f"/api/v1/posts/{pid}/like"
    assert client.put(url).json() == {"liked": True, "like_count": 1}
    assert client.put(url).json() == {"liked": True, "like_count": 1}  # no duplicate
    item = client.get("/api/v1/feed").json()["items"][0]
    assert (item["like_count"], item["viewer_has_liked"]) == (1, True)

    client.cookies.clear()
    register(client, "bob")
    assert client.put(url).json()["like_count"] == 2
    assert client.get("/api/v1/feed").json()["items"][0]["viewer_has_liked"] is True
    assert client.delete(url).json() == {"liked": False, "like_count": 1}
    assert client.delete(url).json() == {"liked": False, "like_count": 1}
    assert client.get("/api/v1/feed").json()["items"][0]["viewer_has_liked"] is False


def test_concurrent_duplicate_likes_count_once(client):
    from app.main import app

    register(client, "alice")
    pid = upload(client).json()["id"]
    cookies, headers = dict(client.cookies), dict(client.headers)

    def like(_):
        with TestClient(app, cookies=cookies, headers=headers) as c:
            return c.put(f"/api/v1/posts/{pid}/like").status_code

    with ThreadPoolExecutor(8) as pool:
        assert set(pool.map(like, range(8))) == {200}
    assert client.get(f"/api/v1/posts/{pid}").json()["like_count"] == 1


def test_engagement_requires_auth_and_existing_post(client):
    assert client.put("/api/v1/posts/00000000-0000-0000-0000-000000000000/like").status_code == 401
    register(client)
    missing = "/api/v1/posts/00000000-0000-0000-0000-000000000000"
    assert client.put(f"{missing}/like").status_code == 404
    assert client.post(f"{missing}/comments", json={"body": "hi"}).status_code == 404


def test_comments_create_list_and_validate(client):
    register(client, "alice")
    pid = upload(client).json()["id"]
    url = f"/api/v1/posts/{pid}/comments"
    r = client.post(url, json={"body": "  first!  "})
    assert r.status_code == 201
    c = r.json()
    assert (c["body"], c["author"]["username"], c["can_delete"]) == ("first!", "alice", True)
    for bad in ("", "   ", "x" * 2201):
        assert client.post(url, json={"body": bad}).status_code == 422
    assert client.get(f"/api/v1/posts/{pid}").json()["comment_count"] == 1


def test_comment_pagination_oldest_first(client):
    register(client)
    pid = upload(client).json()["id"]
    url = f"/api/v1/posts/{pid}/comments"
    ids = [client.post(url, json={"body": f"c{i}"}).json()["id"] for i in range(5)]
    seen, cursor = [], None
    while True:
        page = client.get(url, params={"limit": 2} | ({"cursor": cursor} if cursor else {})).json()
        seen += [c["id"] for c in page["items"]]
        if not (cursor := page["next_cursor"]):
            break
    assert seen == ids


def test_replies_must_target_same_post(client):
    register(client)
    p1, p2 = upload(client).json()["id"], upload(client).json()["id"]
    parent = client.post(f"/api/v1/posts/{p1}/comments", json={"body": "root"}).json()["id"]
    ok = client.post(f"/api/v1/posts/{p1}/comments", json={"body": "re", "parent_id": parent})
    assert ok.status_code == 201 and ok.json()["parent_id"] == parent
    bad = client.post(f"/api/v1/posts/{p2}/comments", json={"body": "re", "parent_id": parent})
    assert bad.status_code == 422


def test_comment_delete_permissions(client):
    register(client, "owner")
    pid = upload(client).json()["id"]
    url = f"/api/v1/posts/{pid}/comments"
    client.cookies.clear()
    register(client, "commenter")
    mine = client.post(url, json={"body": "by commenter"}).json()["id"]
    client.cookies.clear()
    register(client, "stranger")
    assert client.get(url).json()["items"][0]["can_delete"] is False
    assert client.delete(f"/api/v1/comments/{mine}").status_code == 403

    login_as(client, "owner")  # post owner can moderate their post's comments
    assert client.get(url).json()["items"][0]["can_delete"] is True
    assert client.delete(f"/api/v1/comments/{mine}").status_code == 204
    assert client.get(url).json()["items"] == []
    assert client.get(f"/api/v1/posts/{pid}").json()["comment_count"] == 0
    assert client.delete(f"/api/v1/comments/{mine}").status_code == 404


def test_deleted_post_blocks_engagement(client):
    register(client)
    pid = upload(client).json()["id"]
    client.delete(f"/api/v1/posts/{pid}")
    assert client.put(f"/api/v1/posts/{pid}/like").status_code == 404
    assert client.get(f"/api/v1/posts/{pid}/comments").status_code == 404


def test_comment_rate_limit(client):
    register(client)
    pid = upload(client).json()["id"]
    codes = [
        client.post(f"/api/v1/posts/{pid}/comments", json={"body": "hi"}).status_code
        for _ in range(31)
    ]
    assert codes[:30] == [201] * 30 and codes[30] == 429
