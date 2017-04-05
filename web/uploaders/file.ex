defmodule UcxChat.File do
  use Arc.Definition

  # Include ecto support (requires package arc_ecto installed):
  use Arc.Ecto.Definition
  require Logger

  def __storage, do: Arc.Storage.Local

  @versions [:original]

  # To add a thumbnail version:
  # @versions [:original, :thumb]

  # Whitelist file extensions:
  def validate({file, _}) do
    ~w(.jpg .jpeg .gif .png .txt .text .doc .pdf .wav .mp3 .mp4 .mov .m4a .xls) |> Enum.member?(Path.extname(file.file_name))
  end

  # Define a thumbnail transformation:
  # def transform(:thumb, _) do
  #   {:convert, "-strip -thumbnail 250x250^ -gravity center -extent 250x250 -format png", :png}
  # end

  # Override the persisted filenames:
  # def filename(version, params) do
  #   Logger.warn "filename version: #{inspect version}, params: #{inspect params}"
  #   version
  # end

  def acl(_, _), do: :public_read

  # Override the storage directory:
  def storage_dir(version, {file, scope}) do
    Logger.warn "storage dir file: #{inspect file}, scope: #{inspect scope}, version: #{inspect version}"
    "priv/static/uploads/#{scope.message_id}"

    # "priv/uploads/#{scope.channel_id}"
    # "/priv/uploads"
  end

  # Provide a default URL if there hasn't been a file uploaded
  # def default_url(version, scope) do
  #   "/images/avatars/default_#{version}.png"
  # end

  # Specify custom headers for s3 objects
  # Available options are [:cache_control, :content_disposition,
  #    :content_encoding, :content_length, :content_type,
  #    :expect, :expires, :storage_class, :website_redirect_location]
  #
  # def s3_object_headers(version, {file, scope}) do
  #   [content_type: Plug.MIME.path(file.file_name)]
  # end
end