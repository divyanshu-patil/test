from app.tests.conftest import image_bytes, register


def upload(client, n=1, caption="hello #world", fmt="PNG", alts=None):
    files = [("files", (f"p{i}.png", image_bytes(fmt), "image/png")) for i in range(n)]
    data = {"caption": caption}
    if alts:
        data["alt_texts"] = alts
    return client.post("/api/v1/posts", files=files, data=data)


def test_requires_auth(client):
    assert client.get("/api/v1/feed").status_code == 401
    assert upload(client).status_code == 401


def test_create_post_and_view_media(client):
    register(client)
    r = upload(client, n=2, alts=["a sunset", "a dog"])
    assert r.status_code == 201, r.text
    post = r.json()
    assert post["caption"] == "hello #world"
    assert [m["alt_text"] for m in post["media"]] == ["a sunset", "a dog"]
    m = post["media"][0]
    assert (m["width"], m["height"]) == (800, 600)
    full = client.get(m["url"])
    thumb = client.get(m["thumb_url"])
    assert full.status_code == thumb.status_code == 200
    assert full.headers["content-type"] == "image/webp"
    assert len(thumb.content) < len(full.content) or len(full.content) > 0
    assert client.get(f"/api/v1/posts/{post['id']}").json()["id"] == post["id"]


def test_large_images_are_downscaled(client):
    register(client)
    files = [("files", ("big.jpg", image_bytes("JPEG", (3000, 2000)), "image/jpeg"))]
    m = client.post("/api/v1/posts", files=files).json()["media"][0]
    assert (m["width"], m["height"]) == (1440, 960)


def test_rejects_non_images_regardless_of_declared_type(client):
    register(client)
    files = [("files", ("evil.png", b"<?php system($_GET['x']); ?>", "image/png"))]
    r = client.post("/api/v1/posts", files=files)
    assert r.status_code == 422
    assert client.get("/api/v1/feed").json()["items"] == []


def test_rejects_too_many_or_zero_images(client):
    register(client)
    assert upload(client, n=11).status_code == 422
    assert client.post("/api/v1/posts", data={"caption": "x"}).status_code == 422


def test_rejects_oversized_file(client, monkeypatch):
    from app.core.config import get_settings

    register(client)
    monkeypatch.setattr(get_settings(), "max_upload_bytes", 1000)
    assert upload(client).status_code == 413


def test_feed_newest_first_with_cursor_pagination(client):
    register(client, "alice")
    ids = [upload(client, caption=f"post {i}").json()["id"] for i in range(5)]
    seen, cursor = [], None
    while True:
        params = {"limit": 2} | ({"cursor": cursor} if cursor else {})
        page = client.get("/api/v1/feed", params=params).json()
        seen += [p["id"] for p in page["items"]]
        cursor = page["next_cursor"]
        if not cursor:
            break
    assert seen == ids[::-1]  # newest first, no duplicates, nothing missing
    assert client.get("/api/v1/feed", params={"cursor": "garbage!"}).status_code == 422


def test_feed_includes_other_users_posts(client):
    register(client, "alice")
    upload(client, caption="from alice")
    client.cookies.clear()
    register(client, "bob")
    captions = [p["caption"] for p in client.get("/api/v1/feed").json()["items"]]
    assert captions == ["from alice"]


def test_only_owner_can_delete(client):
    register(client, "alice")
    post = upload(client).json()
    client.cookies.clear()
    register(client, "mallory")
    assert client.delete(f"/api/v1/posts/{post['id']}").status_code == 403

    client.cookies.clear()
    client.post("/api/v1/auth/login", json={"identifier": "alice", "password": "secret123"})
    client.headers["x-csrf-token"] = client.cookies["socially_csrf"]
    assert client.delete(f"/api/v1/posts/{post['id']}").status_code == 204
    assert client.get(f"/api/v1/posts/{post['id']}").status_code == 404
    assert client.get(post["media"][0]["url"]).status_code == 404
    assert client.get("/api/v1/feed").json()["items"] == []
