package rpc

import (
	"context"
	"net"
	"testing"
	"time"
)

func TestHTTPAll(t *testing.T) {
	requireAria2(t)
	const targetURL = "https://nodejs.org/dist/index.json"
	rpc, err := New(context.Background(), "http://localhost:6800/jsonrpc", "", time.Second, &DummyNotifier{})
	if err != nil {
		t.Fatal(err)
	}
	defer rpc.Close()
	g, err := rpc.AddURI([]string{targetURL})
	if err != nil {
		t.Fatal(err)
	}
	println(g)
	if _, err = rpc.TellActive(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.PauseAll(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.TellStatus(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetURIs(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetFiles(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetPeers(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.TellActive(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.TellWaiting(0, 1); err != nil {
		t.Error(err)
	}
	if _, err = rpc.TellStopped(0, 1); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetOption(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetGlobalOption(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetGlobalStat(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetSessionInfo(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.Remove(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.TellActive(); err != nil {
		t.Error(err)
	}
}

func TestWebsocketAll(t *testing.T) {
	requireAria2(t)
	const targetURL = "https://nodejs.org/dist/index.json"
	rpc, err := New(context.Background(), "ws://localhost:6800/jsonrpc", "", time.Second, &DummyNotifier{})
	if err != nil {
		t.Fatal(err)
	}
	defer rpc.Close()
	g, err := rpc.AddURI([]string{targetURL})
	if err != nil {
		t.Fatal(err)
	}
	println(g)
	if _, err = rpc.TellActive(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.PauseAll(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.TellStatus(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetURIs(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetFiles(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetPeers(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.TellActive(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.TellWaiting(0, 1); err != nil {
		t.Error(err)
	}
	if _, err = rpc.TellStopped(0, 1); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetOption(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetGlobalOption(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetGlobalStat(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.GetSessionInfo(); err != nil {
		t.Error(err)
	}
	if _, err = rpc.Remove(g); err != nil {
		t.Error(err)
	}
	if _, err = rpc.TellActive(); err != nil {
		t.Error(err)
	}
}

func requireAria2(t *testing.T) {
	t.Helper()
	conn, err := net.DialTimeout("tcp", "localhost:6800", time.Second)
	if err != nil {
		t.Skipf("skipping aria2 integration test: %v", err)
	}
	_ = conn.Close()
}
