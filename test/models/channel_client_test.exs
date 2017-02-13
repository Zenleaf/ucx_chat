defmodule UcxChat.ChannelClientTest do
  use UcxChat.ModelCase

  alias UcxChat.ChannelClient

  @valid_attrs %{client_id: 1, channel_id: 1}
  @invalid_attrs %{}

  test "changeset with valid attributes" do
    changeset = ChannelClient.changeset(%ChannelClient{}, @valid_attrs)
    assert changeset.valid?
  end

  test "changeset with invalid attributes" do
    changeset = ChannelClient.changeset(%ChannelClient{}, @invalid_attrs)
    refute changeset.valid?
  end
end
