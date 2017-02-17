defmodule UcxChat.ServiceHelpers do
  alias UcxChat.{Repo, FlexBarView, Channel, Client, ChannelClient}

  import Ecto.Query

  def get!(model, id, opts \\ []) do
    preload = opts[:preload] || []
    model
    |> where([c], c.id == ^id)
    |> preload(^preload)
    |> Repo.one!
  end
  def get(model, id, opts \\ []) do
    preload = opts[:preload] || []
    model
    |> where([c], c.id == ^id)
    |> preload(^preload)
    |> Repo.one
  end

  def get_by!(model, field, value, opts \\ []) do
    preload = opts[:preload] || []
    model
    |> where([c], field(c, ^field) == ^value)
    |> preload(^preload)
    |> Repo.one!
  end

  def get_by(model, field, value, opts \\ []) do
    preload = opts[:preload] || []
    model
    |> where([c], field(c, ^field) == ^value)
    |> preload(^preload)
    |> Repo.one
  end

  def get_channel(channel_id, preload \\ []) do
    Channel
    |> where([c], c.id == ^channel_id)
    |> preload(^preload)
    |> Repo.one!
  end

  def get_client(client_id, opts \\ []) do
    preload = opts[:preload] || []
    Client
    |> where([c], c.id == ^client_id)
    |> preload(^preload)
    |> Repo.one!
  end

  def get_channel_client(channel_id, client_id, opts \\ []) do
    preload = opts[:preload] || []

    ChannelClient
    |> where([c], c.client_id == ^client_id and c.channel_id == ^channel_id)
    |> preload(^preload)
    |> Repo.one!
  end

  def get_client_by_name(nickname, preload \\ [])
  def get_client_by_name(nil, _), do: nil
  def get_client_by_name(nickname, preload) do
    Client
    |> where([c], c.nickname == ^nickname)
    |> preload(^preload)
    |> Repo.one!
  end

  def count(query) do
    query |> select([m], count(m.id)) |> Repo.one
  end

  def last_page(query, page_size \\ 150) do
    count = count(query)
    offset = case count - page_size do
      offset when offset >= 0 -> offset
      _ -> 0
    end
    query |> offset(^offset) |> limit(^page_size)
  end

  @dt_re ~r/(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})\.(\d+)/

  def get_timestamp() do
    @dt_re
    |> Regex.run(DateTime.utc_now() |> to_string)
    |> tl
    |> to_string
    # |> String.to_integer
  end

  def format_date(%NaiveDateTime{} = dt) do
    {{yr, mo, day}, _} = NaiveDateTime.to_erl(dt)
    month(mo) <> " " <> to_string(day) <> ", " <> to_string(yr)
  end

  def format_time(%NaiveDateTime{} = dt) do
    {_, {hr, min, _sec}} = NaiveDateTime.to_erl(dt)
    min = to_string(min) |> String.pad_leading(2, "0")
    {hr, meridan} =
      case hr do
        hr when hr < 12 -> {hr, " AM"}
        hr when hr == 12 -> {hr, " PM"}
        hr -> {hr - 12, " PM"}
      end
    to_string(hr) <> ":" <> min <> meridan
  end

  def format_date_time(%NaiveDateTime{} = dt) do
    format_date(dt) <> " " <> format_time(dt)
  end

  def month(1), do: "January"
  def month(2), do: "February"
  def month(3), do: "March"
  def month(4), do: "April"
  def month(5), do: "May"
  def month(6), do: "June"
  def month(7), do: "July"
  def month(8), do: "August"
  def month(9), do: "September"
  def month(10), do: "October"
  def month(11), do: "November"
  def month(12), do: "December"
end